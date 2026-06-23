# Pontix Extension Workspace

This repository is the Pontix Chrome extension workspace. Treat it as a
security-sensitive browser extension, not as a generic web app.

## Repo Map

- `src/manifest/manifest.json`: source manifest. `build/manifest.json` is
  generated.
- `src/scripts/content.js`: page-observation content script. It must not receive
  tokens, provider API keys, passwords, or arbitrary platform commands.
- `src/scripts/background.js`: service worker and trusted network boundary.
- `src/scripts/sidebar.js`: side panel UI and explicit learner/user intent.
- `src/scripts/supabase-client.template.js`: generated Supabase client template.
- `.build/` and `build/`: generated output, not source of truth.
- `docs/`: policy, privacy, and setup notes.

## Safe Change Rules

- Read `ARCHITECTURE.md` before auth, storage, messaging, manifest, or provider
  changes.
- Preserve user changes in `src/scripts/content.js`; this file often has local
  selection-behavior edits.
- Do not commit generated `.build/`, `build/`, `dist/`, `.env`, or
  `node_modules` content.
- Do not log selected text, surrounding sentence, passwords, tokens, provider
  API keys, or full request/response objects.
- Store secrets only in trusted local extension storage. Never place provider
  keys, 2000NL tokens, or passwords in `chrome.storage.sync`.
- Keep Pontix Supabase auth separate from future 2000NL Connect auth.
- Add or update tests when changing message validation, storage lifecycle,
  manifest permissions, or token attachment rules.

## Validation

Run:

```bash
npm test
npm run package
```

For narrow JS syntax checks during extension work:

```bash
node --check src/scripts/background.js
node --check src/scripts/sidebar.js
node --check src/scripts/security.js
```

If `src/scripts/content.js` already has unrelated local edits, do not reformat
or stage those edits accidentally.
