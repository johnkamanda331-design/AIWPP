---
name: Frontend port wiring
description: Why the aippmcs Vite dev server must be started with PORT=22559
---

The artifact.toml for `artifacts/aippmcs` declares `localPort = 22559`. The Replit preview proxy routes traffic to that port.

The Vite config reads `process.env.PORT` and uses it as the server port — but only if the env var is present. When PORT is absent (e.g. a plain `vite --host 0.0.0.0` invocation), Vite falls back to its default port 5173, which the proxy cannot reach.

**Rule:** Always start the frontend workflow with `PORT=22559` prefixed:

```
PORT=22559 pnpm --filter @workspace/aippmcs run dev
```

**Why:** This project was imported from GitHub, not bootstrapped via `createArtifact()`, so the managed artifact workflow (which would have injected PORT automatically) was never created. The manually configured workflow must pass PORT explicitly.

**How to apply:** Any time you restart or reconfigure the `artifacts/aippmcs: web` workflow, ensure the command includes `PORT=22559`.
