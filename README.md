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

The current implementation is intentionally mock-driven so that the surrounding developer experience (CLI flows, configuration, validation, etc.) can be built before wiring up live APIs.

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

## Available scripts

| Command        | Description |
| -------------- | ----------- |
| `npm start`    | Executes the CLI entry (`src/index.js`). |
| `npm run dev`  | Runs the CLI in watch mode using Node’s built-in `--watch`. |
| `npm run lint` | Uses `node --check` on every `.js` file for fast syntax validation. |

## Next steps

- Replace the mock Boromir/Gemini clients with real HTTP requests and API calls.
- Introduce persistent caching for article payloads.
- Expand the CLI into an API or desktop UI once the retrieval layer is stable.
