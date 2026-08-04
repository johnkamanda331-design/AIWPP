---
name: Artifact registration on GitHub import
description: When a project is imported from GitHub with pre-built artifacts, those artifacts are NOT auto-registered with the Replit platform and must be enrolled manually.
---

## The problem

GitHub-imported projects that already contain `artifacts/<slug>/.replit-artifact/artifact.toml` files are NOT automatically registered. `listArtifacts()` returns `[]`, `presentArtifact` fails with "not found", and the preview is blank even though the workflow runs fine.

## Fix

1. Back up the existing artifact directory: `cp -r artifacts/<slug> /tmp/<slug>-bak`
2. Delete the original: `rm -rf artifacts/<slug>`
3. Call `createArtifact()` with the matching slug/previewPath — this registers it with the platform and scaffolds a minimal project
4. Restore the real source files over the scaffold (keep new `node_modules` and `.replit-artifact`):
   - `src/`, `index.html`, `components.json`, `tsconfig.json`, `vite.config.ts`, `package.json`, `public/`
5. Run `pnpm install` at workspace root to sync deps
6. Restart the managed workflow, then `presentArtifact`

**Why:** `createArtifact()` is the only path that registers an artifact with the platform. The `artifact.toml` file alone is not sufficient — platform registration is a separate step.

## AIPPMCS-specific note

The `vite.config.ts` in aippmcs throws if `PORT` or `BASE_PATH` are not set (unlike the scaffold which treats them as optional). The managed artifact workflow injects both, so this is fine in normal operation — but running `vite` manually without those vars will fail.
