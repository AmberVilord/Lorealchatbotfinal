# Project 8: L'Oreal Chatbot

Build a beginner-friendly chatbot that only answers L'Oreal beauty questions.

## What this starter now includes

- L'Oreal branding (logo, palette, and chat styling)
- Chat conversation bubbles for user and assistant
- "Latest question" display above the chat response
- Conversation history (`messages`) for multi-turn context
- OpenAI call using `async/await`
- Cloudflare Worker support for secure API usage

## Local setup (temporary)

1. Use `secrets.js` only for local testing.
2. Add either:
- `WORKER_URL` (recommended)
- or `OPENAI_API_KEY` (temporary local testing only)
3. Open `index.html` with Live Preview.

## Cloudflare Worker setup

1. Create a Worker in Cloudflare.
2. Copy code from `RESOURCE_cloudflare-worker.js` into your Worker.
3. In Worker settings, add secret:
- Key: `OPENAI_API_KEY`
- Value: your OpenAI key
4. Deploy Worker.
5. Copy deployed Worker URL and put it in `secrets.js` as `WORKER_URL`.

## Security reminder

If an API key is ever shared in chat, code, or commits, rotate it immediately in the OpenAI dashboard.

## Prompt behavior

The system prompt is configured so the assistant:

- answers only L'Oreal and beauty-related questions
- politely refuses unrelated topics
- provides concise recommendations

## Font case study note

For your reflection requirement, review the Monotype case study on L'Oreal typography and summarize what you notice about brand consistency across products.
