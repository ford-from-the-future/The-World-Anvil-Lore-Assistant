# World Anvil Lore Assistant (WALA)

World Anvil Lore Assistant (WALA) is a local AI-powered tool that connects directly to a user’s World Anvil world via the Boromir API, enabling natural-language querying, cross-article discovery, and structured lore exploration. It integrates with Google Gemini for reasoning and generation, while storing user credentials securely on the local machine.

WALA functions as an intelligent retrieval-and-synthesis layer on top of World Anvil, returning AI-generated insights accompanied by direct links to the original articles referenced.

## Project structure

```
├── .env.example          # Template for the required credentials
├── package.json          # Node.js project manifest (pure ESM)
├── scripts/lint.js       # Lightweight syntax checker (node --check)
└── src
    ├── app.js            # LoreAssistant orchestration class
    ├── config/env.js     # Environment loading and validation helpers
    ├── services/         # Boromir + Gemini client stubs
    ├── types/            # Shared typedefs/JSDoc models
    └── index.js          # CLI entry point
```

The Boromir client still returns deterministic sample data so the CLI can operate without the live World Anvil API, but the Gemini integration now calls Google’s hosted API for real text generation.

## Getting started

1. **Install Node.js 18+**
2. **Clone the repository** and copy the environment template:
   ```bash
   cp .env.example .env
   ```
3. **Populate the credentials** inside `.env` once you have:
   - `WALA_APPLICATION_KEY`
   - `WALA_AUTH_TOKEN`
   - `WALA_WORLD_ID`
   - `GOOGLE_GEMINI_API_KEY`
4. **Run the CLI**:
   ```bash
   npm start -- "What secrets lie in the capital city?"
   ```
   or simply `npm start` and follow the interactive prompt.

## Gemini integration

- The CLI sends prompts to [Google Gemini](https://ai.google.dev/) via the public REST API endpoint
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent`.
- Set `GOOGLE_GEMINI_API_KEY` inside your `.env` file to authorize requests. The CLI will abort with a helpful error message if
  the key is missing.
- If you prefer a different Gemini model, adjust the `DEFAULT_MODEL` constant in `src/services/geminiClient.js`.
- World/Article metadata retrieved from Boromir is embedded directly in the prompt so Gemini can ground its response in the
  supplied context. Article titles are surfaced back to the CLI as references.

## Available scripts

| Command        | Description |
| -------------- | ----------- |
| `npm start`    | Executes the CLI entry (`src/index.js`). |
| `npm run dev`  | Runs the CLI in watch mode using Node’s built-in `--watch`. |
| `npm run lint` | Uses `node --check` on every `.js` file for fast syntax validation. |

## Manual verification

A snapshot of the latest CLI run (with the sample question "What mysteries lie within the royal archives?") is recorded in
[`docs/manual-test.md`](docs/manual-test.md). Use it as a reference when confirming local behavior or comparing future output
once the real APIs are wired in.

## Next steps

- Replace the mock Boromir client with real HTTP requests and API calls.
- Introduce persistent caching for article payloads.
- Expand the CLI into an API or desktop UI once the retrieval layer is stable.
