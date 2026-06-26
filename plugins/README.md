# AI Assistant Plugins

This directory groups assistant-side integrations by **host** — one subdirectory per AI assistant. Each subdirectory is the plugin root for its host, packaging the draw.io skill in whatever format that host expects (manifest schema, file layout, invocation convention).

| Directory | Host | Status |
|-----------|------|--------|
| [`claude-code/`](claude-code/README.md) | [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | ✅ Available |

The Claude Code plugin is published through a marketplace manifest at the repo root ([`.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json)), so users can install it with:

```
/plugin marketplace add jgraph/drawio-mcp
/plugin install drawio@drawio
```

## Adding a plugin for another host

If support for another assistant (Cursor, Codex, etc.) is added later, it lands as a sibling directory at this level:

```
plugins/
└── claude-code/              ← Claude Code plugin
```

The draw.io guidance itself — *how* to generate `.drawio` files, embed XML in PNG/SVG/PDF, and produce `app.diagrams.net` URLs — is shared. Only the wrapping (manifest format, file layout, invocation prefix) differs per host, and each host has its own plugin/skill model, so the wrapping is not assumed to be uniform.

The single source of truth for draw.io XML generation guidance lives at [`../shared/xml-reference.md`](../shared/xml-reference.md) — every plugin references that file rather than duplicating its contents.

## Other delivery mechanisms in this repo

Plugins are one of four ways to integrate draw.io with AI assistants. See the [root README](../README.md) for the full comparison with the MCP App Server, MCP Tool Server, and Claude Project Instructions approaches.
