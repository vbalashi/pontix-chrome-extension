# Pontix Extension Architecture

## Runtime Boundaries

Pontix has three extension runtimes:

- **Content script** observes pages and captures bounded user-selection
  snapshots. It may send a versioned message to the service worker. It must not
  receive Supabase sessions, provider API keys, 2000NL access/refresh tokens, or
  mutation credentials.
- **Service worker** is the trusted boundary for validated messages, ephemeral
  selection transport, provider network calls that require secrets, future
  2000NL Connect PKCE flow, token refresh/revoke, and allowlisted Platform API
  calls.
- **Side panel** owns presentation and explicit user intent. It asks the service
  worker to consume the latest selection or run a defined command. It does not
  construct arbitrary Platform API requests and must not access 2000NL tokens.

## Identity Boundaries

Pontix Supabase auth remains the legacy Pontix cloud-sync identity. It is not a
2000NL user session and must never be forwarded to 2000NL Platform APIs.

Future 2000NL integration uses a separate Connected Client registration, for
example:

- `pontix_chrome_dev`
- `pontix_chrome`

The service worker owns that PKCE flow through `chrome.identity` and stores
opaque access/refresh tokens in trusted local extension storage only.

## Storage Ownership

- `chrome.storage.session`: ephemeral selected text/sentence snapshots with TTL
  and consume semantics.
- `chrome.storage.local`: trusted local-only secrets such as provider API keys,
  future 2000NL refresh/access tokens, and local-only extension state.
- `chrome.storage.sync`: non-secret preferences only.

User passwords are never persisted. Existing `encrypted_user_password` records
must be removed during startup/migration.

Provider API keys are local-only. Cloud sync may sync non-secret profile
preferences but must not sync keys or move them into Supabase profile/settings
records.

## Message Contract

Internal messages use a versioned contract:

- `version: 1`
- `action`: explicit command/event name
- bounded payload fields only
- `requestId`/correlation id where the caller needs a response
- sender id, tab id, frame id, and URL validation in the service worker

Unknown actions or fields are rejected. Legacy messages are normalized only at
the service-worker boundary during migration.

## Privacy Rules

- Raw selected text and surrounding sentence are ephemeral. They must not
  survive browser restart, sync across devices, or be logged.
- Top-level page selection is the first supported provenance model for future
  2000NL work. Cross-origin iframe provenance is rejected or explicitly modeled
  before use.
- Production logs redact secrets and content-bearing fields.

## Source Binding Contract

`src/scripts/sourceBinding.js` owns the client-side privacy contract for future
2000NL provenance. It can classify `web_page`, `text_document`, and supported
`ebook` selections, normalize URL observations, build hash-based bounded
selection locators, invalidate bindings across navigation/tab/frame changes, and
freeze one explicit action envelope.

Live content-script wiring is intentionally separate from this module while
`src/scripts/content.js` has unrelated local selection-timing changes. When that
file is ready, the content script should pass real `Range` offsets and bounded
context into this module through the service worker instead of using
`containerText.indexOf(selectedText)`.

## External Dependencies

Production extension paths use bundled code. Runtime remote-code/CDN loading is
not allowed for production builds. The Supabase template uses bundled
`supabase.js` and falls back to local-only mode when it is unavailable.

## 2000NL Relation

Pontix should call 2000NL directly from its service worker using its own
Connected Client. It must not proxy through AudioFilms and must not reuse the
AudioFilms client id, token storage, or source-specific provenance builder.
