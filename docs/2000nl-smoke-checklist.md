# 2000NL Connected Client Smoke Checklist

Use this checklist before closing the Pontix web/text/ebook provenance issue.

## Prerequisites

- Pontix is loaded from the generated `build/` directory.
- The extension ID is registered in 2000NL as `pontix_chrome_dev` or
  `pontix_chrome`.
- The registration includes:
  - redirect URI from `chrome.identity.getRedirectURL()`;
  - origin `chrome-extension://<extension-id>`;
  - scopes `platform:read platform:write offline_access`.
- The tester can sign in to 2000NL and approve Connect consent.

## Smoke Cases

1. Connect
   - Trigger `connect2000nl` from the side panel or service-worker command
     surface.
   - Approve 2000NL Connect.
   - Verify `get2000nlSession` reports `connected: true` without exposing token
     values to the side panel or content script.

2. Normal article selection
   - Open an HTTP(S) article page.
   - Select a repeated word occurrence.
   - Consume the selection snapshot.
   - Verify the snapshot includes a `sourceBinding` with `sourceKind:
     "web_page"`, `navigationId`, `selectionHash`, `contextHash`, and character
     offsets.

3. Read-only lookup
   - Submit `platformLookup` for the selected form.
   - Verify the request goes to `/api/platform/v1/lookup`.
   - Verify no mutation endpoint is called during lookup.

4. Explicit learning action
   - Submit `platformAction` for an available card action.
   - Verify the request goes to `/api/platform/v1/actions`.
   - Verify `sourceContext.contractVersion` is `source-context-v2`.
   - Verify the payload contains selection/context hashes and offsets, not full
     page/document content.

5. Refresh and reconnect
   - Force or wait for an expired access token.
   - Repeat lookup or action.
   - Verify `/api/connect/token` refreshes the token before the Platform call.

6. Disconnect
   - Trigger `disconnect2000nl`.
   - Verify `/api/connect/revoke` is called and `get2000nlSession` reports
     `connected: false`.

7. Unsupported pages
   - Try `chrome://`, extension pages, `file://`, and a cross-origin iframe case.
   - Verify actions fail or degrade explicitly rather than silently attributing
     private content to the wrong source.

## Evidence To Record

- Extension ID and registered client id.
- 2000NL environment: local/staging/production.
- Browser console/network proof for connect, lookup, action, refresh, revoke.
- The accepted Platform event id for the explicit action.
- Confirmation that no token values appear in content-script or side-panel logs.
