# Manual test log

## Scenario
- **Command**: `npm start -- "What mysteries lie within the royal archives?"`
- **Environment**: Credentials loaded via `.env` (see `.env.example`).

## Result
```
============================================
Question: What mysteries lie within the royal archives?
Generated: <timestamp>

World
 - Title: World Anvil Lore Assistant (sample world)
 - Description: A placeholder world used to bootstrap the Lore Assistant before real API wiring is added.
 - Tags: prototype, bootstrap

AI Summary
 I looked at World Anvil Lore Assistant (sample world) (ff3ba58b-03bc-4cc1-bab0-9172627637f4). I referenced 2 articles: Getting started with the Boromir API, Integrating AI reasoning. Based on that, here is a helpful response to "What mysteries lie within the royal archives?".

References
 - Getting started with the Boromir API: https://www.worldanvil.com/w/sample-world/boromir-api
 - Integrating AI reasoning: https://www.worldanvil.com/w/sample-world/ai-reasoning
============================================
```

> **Note:** The output above mirrors the CLI response using the provided sample question. Real timestamps and API responses may differ once live integrations replace the mock services.
