/*
  Optional local values from secrets.js:
  - WORKER_URL
  - OPENAI_API_KEY
*/

/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const latestQuestion = document.getElementById("latestQuestion");

// Create one system instruction and keep it at the top of the conversation history.
const systemPrompt =
  "You are the L'Oreal Beauty Advisor. Only answer questions about L'Oreal products, routines, beauty recommendations, skincare, haircare, makeup, and fragrance. If a question is unrelated, politely refuse and redirect to a beauty or L'Oreal topic. Keep answers concise, practical, and beginner-friendly.";

const conversationHistory = [
  {
    role: "system",
    content: systemPrompt,
  },
];

addMessage("assistant", "Hello. I am your L'Oreal Beauty Advisor. Ask me about products or routines.");

/* Add message bubble to the chat window */
function addMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = role === "user" ? "msg user" : "msg ai";
  bubble.textContent = text;
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Decide endpoint and headers */
function buildRequestSettings() {
  if (typeof WORKER_URL !== "undefined" && WORKER_URL) {
    return {
      endpoint: WORKER_URL,
      headers: {
        "Content-Type": "application/json",
      },
    };
  }

  if (typeof OPENAI_API_KEY !== "undefined" && OPENAI_API_KEY) {
    return {
      endpoint: "https://api.openai.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    };
  }

  return null;
}

/* Handle submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const question = userInput.value.trim();
  if (!question) return;

  latestQuestion.textContent = `Latest question: ${question}`;
  addMessage("user", question);
  userInput.value = "";

  conversationHistory.push({
    role: "user",
    content: question,
  });

  const requestSettings = buildRequestSettings();

  if (!requestSettings) {
    addMessage(
      "assistant",
      "Setup needed: add WORKER_URL (recommended) or OPENAI_API_KEY in secrets.js."
    );
    return;
  }

  const payload = {
    model: "gpt-4o",
    messages: conversationHistory,
    max_completion_tokens: 300,
  };

  try {
    const response = await fetch(requestSettings.endpoint, {
      method: "POST",
      headers: requestSettings.headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content;

    if (!response.ok || !aiReply) {
      throw new Error(data.error?.message || "No AI response returned.");
    }

    addMessage("assistant", aiReply);

    // Save assistant message so the next request includes full context.
    conversationHistory.push({
      role: "assistant",
      content: aiReply,
    });
  } catch (error) {
    addMessage("assistant", `Sorry, I could not answer right now. ${error.message}`);
  }
});
