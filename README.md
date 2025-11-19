World Anvil Lore Assistant (WALA)

World Anvil Lore Assistant (WALA) is a local AI-powered tool that connects directly to a user’s World Anvil world via the Boromir API, enabling natural-language querying, cross-article discovery, and structured lore exploration. It integrates with Google Gemini for reasoning and generation, while storing user credentials securely on the local machine.

WALA functions as an intelligent retrieval-and-synthesis layer on top of World Anvil, returning AI-generated insights accompanied by direct links to the original articles referenced.

Features
Boromir API Integration

WALA connects to the user’s World Anvil world using three user-provided configuration values:

Application Key (client ID)

Auth Token (Bearer token)

World ID

These values are stored securely and locally. With valid credentials, WALA can:

Fetch articles, categories, timelines, metadata

Retrieve article content, excerpts, tags, and relationships

Resolve category and hierarchical navigation within the world

AI-Augmented Lore Querying (Google Gemini)

Using Google Gemini, WALA:

Accepts natural-language questions

Identifies relevant World Anvil articles

Synthesizes readable answers grounded in actual world content

Returns results with inline links to the articles referenced

Local-First Architecture

No cloud storage

No third-party server processing of credentials or content

Optional local caching of articles for faster repeated queries

All AI reasoning uses locally retrieved/processed data

Cross-Linked Responses

Every answer includes:

An AI-generated explanation

Direct links back to the underlying World Anvil articles

Optional expanded metadata or excerpts (configurable)

Requirements

Node.js (version 18+ recommended)

npm or yarn

A World Anvil account with API application access

A Google Gemini API key
