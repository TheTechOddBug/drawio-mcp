# MCP Tool Server

The original draw.io MCP server. Opens diagrams directly in the draw.io editor via browser.

## Key Files

| File | Purpose |
|------|---------|
| `src/index.js` | Single-file server (stdio transport, vanilla JS, no build step) |
| `src/libavoid-pass.js` | Server-side libavoid edge-routing pass for `open_drawio_xml` (`routing: "libavoid"`) — parses the mxGraphModel XML, runs the shared `computeLibavoidRoutes`, writes waypoints back |
| `vendor/libavoid/` | Vendored libavoid-js **node** build + `libavoid.wasm` (see its README). Loaded by path in plain Node — no inlining/base64 (that's the app server's sandbox concern) |

## Tools

### `open_drawio_xml`

Opens draw.io with native XML content. Full control over styling and positioning.

**`routing: "libavoid"`** (optional) runs an obstacle-avoiding orthogonal edge-routing pass server-side before the URL is built: vertices stay put, connectors are recomputed to route *around* shapes in clean right angles (draw.io's built-in router has no obstacle avoidance). The routing math is the shared `computeLibavoidRoutes` (canonical in `shared/libavoid-routing.js`, copied into `src/` by `copy-shared`), identical to the app server's. Fails safe — any parse/route issue returns the original XML unrouted.

### `open_drawio_csv`

Opens draw.io with CSV data converted to a diagram. Useful for org charts, but CSV processing can fail — prefer Mermaid when possible.

**Avoid** using `%column%` placeholders in style attributes (like `fillColor=%color%`) — causes "URI malformed" errors.

### `open_drawio_mermaid`

Opens draw.io with Mermaid.js syntax. **Recommended default** — handles flowcharts, sequences, ER diagrams, Gantt charts, and more reliably.

## URL Generation

1. Content is encoded with `encodeURIComponent`
2. Compressed using pako `deflateRaw`
3. Encoded as base64
4. Wrapped in a JSON object: `{ type, compressed: true, data }`
5. Appended to the draw.io URL as `#create={...}`

## Quick Decision Guide

| Need | Use | Reliability |
|------|-----|-------------|
| Flowchart, sequence, ER diagram | `open_drawio_mermaid` | High |
| Custom styling, precise positioning | `open_drawio_xml` | High |
| Org chart from data | `open_drawio_csv` | Medium |

## XML Reference

The `open_drawio_xml` tool description is loaded at startup from `shared/xml-reference.md` (single source of truth for all prompts). The `copy-shared` script (run on `prestart` and `prepack`) copies it — plus `shared/libavoid-routing.js` — into `src/` so the npm package is self-contained. These copies are gitignored; `libavoid-pass.js` imports the helper from the local copy with a fallback to `../../shared/` for in-repo runs.

## Coding Conventions

- **Allman brace style**: Opening braces go on their own line for all control structures, functions, objects, and callbacks.
- Prefer `function()` expressions over arrow functions for callbacks.
- See the root `CLAUDE.md` for examples.

## Development

```bash
npm install
npm start
```

Published as `@drawio/mcp` on npm. Run with `npx @drawio/mcp`.
