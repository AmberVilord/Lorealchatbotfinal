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
const clearChatBtn = document.getElementById("clearChatBtn");
const menuToggle = document.getElementById("menuToggle");
const quickMenu = document.getElementById("quickMenu");

const CHAT_STORAGE_KEY = "loreal_chat_state_v1";
const welcomeMessage =
  "Hello. I am your L'Oreal Digital Beauty Concierge. Ask me about products or routines.";

// Create one system instruction and keep it at the top of the conversation history.
const systemPrompt =
  "You are the L'Oreal Digital Beauty Concierge. Only answer questions about L'Oreal products, routines, beauty recommendations, skincare, haircare, makeup, and fragrance. If a question is unrelated, politely refuse and redirect to a beauty or L'Oreal topic. Never answer unrelated questions. Keep answers concise, practical, and beginner-friendly.";

const allowedTopicKeywords = [
  "loreal",
  "l'oreal",
  "product",
  "routine",
  "beauty",
  "skin",
  "skincare",
  "hair",
  "haircare",
  "makeup",
  "foundation",
  "concealer",
  "serum",
  "cleanser",
  "moisturizer",
  "hydration",
  "repair",
  "fragrance",
  "tone",
  "texture",
  "glow",
  "spf",
  "sunscreen",
  "lip",
  "mascara",
  "routine",
  "recommend",
  "recommendation",
];

const conversationHistory = [
  {
    role: "system",
    content: systemPrompt,
  },
];

// Store useful user details so the assistant can personalize follow-ups.
const userMemory = {
  name: "",
  goals: [],
  concerns: [],
  preferences: [],
};

const MAX_NON_SYSTEM_MESSAGES = 16;

/* Add message bubble to the chat window */
function addMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = role === "user" ? "msg user" : "msg ai";
  bubble.textContent = text;
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Show the current user question above the assistant response area */
function showLatestQuestion(question) {
  latestQuestion.textContent = `Latest question: ${question}`;
  latestQuestion.classList.add("visible");
}

/* Reset the latest question on next user input */
function resetLatestQuestion() {
  latestQuestion.textContent = "";
  latestQuestion.classList.remove("visible");
}

function saveChatState() {
  const state = {
    history: conversationHistory.slice(1),
    userMemory,
    latestQuestion: latestQuestion.textContent,
    latestQuestionVisible: latestQuestion.classList.contains("visible"),
  };

  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state));
}

function loadChatState() {
  const savedStateText = localStorage.getItem(CHAT_STORAGE_KEY);
  if (!savedStateText) return false;

  try {
    const savedState = JSON.parse(savedStateText);
    const savedHistory = Array.isArray(savedState.history)
      ? savedState.history
      : [];

    if (savedHistory.length) {
      conversationHistory.push(...savedHistory);

      savedHistory.forEach((message) => {
        if (message.role === "user" || message.role === "assistant") {
          addMessage(message.role, message.content);
        }
      });
    }

    if (savedState.userMemory) {
      userMemory.name = savedState.userMemory.name || "";
      userMemory.goals = Array.isArray(savedState.userMemory.goals)
        ? savedState.userMemory.goals
        : [];
      userMemory.concerns = Array.isArray(savedState.userMemory.concerns)
        ? savedState.userMemory.concerns
        : [];
      userMemory.preferences = Array.isArray(savedState.userMemory.preferences)
        ? savedState.userMemory.preferences
        : [];
    }

    if (savedState.latestQuestionVisible && savedState.latestQuestion) {
      latestQuestion.textContent = savedState.latestQuestion;
      latestQuestion.classList.add("visible");
    } else {
      resetLatestQuestion();
    }

    return true;
  } catch (error) {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    return false;
  }
}

function startFreshConversation() {
  conversationHistory.splice(1);
  userMemory.name = "";
  userMemory.goals = [];
  userMemory.concerns = [];
  userMemory.preferences = [];

  chatWindow.innerHTML = "";
  resetLatestQuestion();

  addMessage("assistant", welcomeMessage);
  conversationHistory.push({
    role: "assistant",
    content: welcomeMessage,
  });

  saveChatState();
}

/* Decide endpoint and headers */
function buildRequestSettings() {
  const workerUrl =
    typeof globalThis.WORKER_URL === "string" ? globalThis.WORKER_URL.trim() : "";
  const openAiApiKey =
    typeof globalThis.OPENAI_API_KEY === "string"
      ? globalThis.OPENAI_API_KEY.trim()
      : "";

  if (workerUrl) {
    return {
      endpoint: workerUrl,
      headers: {
        "Content-Type": "application/json",
      },
    };
  }

  if (openAiApiKey) {
    return {
      endpoint: "https://api.openai.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
    };
  }

  return null;
}

/* Guardrail: allow only L'Oreal/beauty-related questions */
function isAllowedTopic(question) {
  const normalizedQuestion = question.toLowerCase();

  return allowedTopicKeywords.some((keyword) =>
    normalizedQuestion.includes(keyword),
  );
}

/* Save useful details from user text for context-aware replies */
function updateUserMemory(question) {
  const lowerQuestion = question.toLowerCase();

  const nameMatch = question.match(/\b(?:i am|i'm|my name is)\s+([a-zA-Z]+)/i);
  if (nameMatch) {
    userMemory.name = nameMatch[1];
  }

  const trackedGoals = [
    "glow",
    "hydration",
    "repair",
    "tone",
    "texture",
    "routine",
  ];
  const trackedConcerns = [
    "acne",
    "dry",
    "oil",
    "oily",
    "frizz",
    "dull",
    "sensitive",
  ];
  const trackedPreferences = [
    "fragrance-free",
    "fragrance free",
    "matte",
    "dewy",
    "lightweight",
  ];

  trackedGoals.forEach((goal) => {
    if (lowerQuestion.includes(goal) && !userMemory.goals.includes(goal)) {
      userMemory.goals.push(goal);
    }
  });

  trackedConcerns.forEach((concern) => {
    if (
      lowerQuestion.includes(concern) &&
      !userMemory.concerns.includes(concern)
    ) {
      userMemory.concerns.push(concern);
    }
  });

  trackedPreferences.forEach((preference) => {
    if (
      lowerQuestion.includes(preference) &&
      !userMemory.preferences.includes(preference)
    ) {
      userMemory.preferences.push(preference);
    }
  });
}

/* Build a short memory summary message used in each API request */
function buildMemoryContextMessage() {
  const memoryParts = [];

  if (userMemory.name) memoryParts.push(`Name: ${userMemory.name}`);
  if (userMemory.goals.length)
    memoryParts.push(`Goals: ${userMemory.goals.join(", ")}`);
  if (userMemory.concerns.length) {
    memoryParts.push(`Concerns: ${userMemory.concerns.join(", ")}`);
  }
  if (userMemory.preferences.length) {
    memoryParts.push(`Preferences: ${userMemory.preferences.join(", ")}`);
  }

  if (!memoryParts.length) return null;

  return {
    role: "system",
    content: `Known user details for personalization: ${memoryParts.join(" | ")}. Use these details when relevant.`,
  };
}

/* Keep the latest conversation turns so prompts stay focused */
function trimConversationHistory() {
  const nonSystemMessages = conversationHistory.slice(1);

  if (nonSystemMessages.length <= MAX_NON_SYSTEM_MESSAGES) return;

  const trimmedMessages = nonSystemMessages.slice(-MAX_NON_SYSTEM_MESSAGES);
  conversationHistory.splice(
    1,
    conversationHistory.length - 1,
    ...trimmedMessages,
  );
}

// Start with no question shown until first submit.
resetLatestQuestion();

const didRestoreState = loadChatState();
if (!didRestoreState) {
  startFreshConversation();
}

userInput.addEventListener("input", () => {
  if (latestQuestion.textContent) {
    resetLatestQuestion();
  }
});

if (menuToggle && quickMenu) {
  menuToggle.addEventListener("click", () => {
    const isOpen = quickMenu.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (event) => {
    const clickedInsideMenu = quickMenu.contains(event.target);
    const clickedToggle = menuToggle.contains(event.target);

    if (
      !clickedInsideMenu &&
      !clickedToggle &&
      quickMenu.classList.contains("open")
    ) {
      quickMenu.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && quickMenu.classList.contains("open")) {
      quickMenu.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.focus();
    }
  });
}

if (clearChatBtn) {
  clearChatBtn.addEventListener("click", () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    startFreshConversation();
  });
}

/* Handle submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const question = userInput.value.trim();
  if (!question) return;

  showLatestQuestion(question);
  addMessage("user", question);
  userInput.value = "";

  if (!isAllowedTopic(question)) {
    const refusalMessage =
      "I can only help with L'Oreal products, routines, and beauty-related questions. Ask me about skincare, haircare, makeup, or recommendations.";

    conversationHistory.push({
      role: "user",
      content: question,
    });
    addMessage("assistant", refusalMessage);

    conversationHistory.push({
      role: "assistant",
      content: refusalMessage,
    });
    trimConversationHistory();
    saveChatState();
    return;
  }

  updateUserMemory(question);

  conversationHistory.push({
    role: "user",
    content: question,
  });

  trimConversationHistory();
  saveChatState();

  const requestSettings = buildRequestSettings();

  if (!requestSettings) {
    addMessage(
      "assistant",
      "Setup needed: add WORKER_URL to config.js for deployment, or use WORKER_URL / OPENAI_API_KEY in secrets.js for local testing."
    );
    return;
  }

  const memoryMessage = buildMemoryContextMessage();
  const messagesForRequest = memoryMessage
    ? [conversationHistory[0], memoryMessage, ...conversationHistory.slice(1)]
    : conversationHistory;

  const payload = {
    model: "gpt-4o",
    messages: messagesForRequest,
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
    trimConversationHistory();
    saveChatState();
  } catch (error) {
    addMessage(
      "assistant",
      `Sorry, I could not answer right now. ${error.message}`,
    );

    conversationHistory.push({
      role: "assistant",
      content: `Sorry, I could not answer right now. ${error.message}`,
    });
    trimConversationHistory();
    saveChatState();
  }
});
