# CLAUDE.md

This file provides guidance to coding assistants when working with code in this repository.

## What This Is

An internal management tool for "Haagse Open Mic" (The Hague open mic event) — artist contact management, performance scheduling (speelschema), photo distribution, and newsletter campaigns.

## Running the App

```bash
npm start          # node server.js, runs on port 3000
```

No build step. The frontend is vanilla JS/HTML served directly from `public/`. No tests or linting configured.

## Git & Deployment

- We develop and work on the `dev` branch in GitHub.
- After completing and verifying a change, you can directly push the changes to the `dev` branch (`git push origin dev`).

## Architecture

**Backend:** Node.js + Express (CommonJS), entry point is `server.js`. Routes are split by feature in `routes/`.

**Frontend:** Vanilla JS ES6 modules in `public/modules/`. No framework, no bundler — files are loaded directly in the browser.

**Database:** No traditional DB. All data lives in Google Sheets (artists, lineups) and Google Drive (photos).

### Key Architectural Patterns

**Authentication:** PIN-based. Client stores PIN in localStorage; every API request sends it as `x-app-pin` header. Backend middleware validates it. Standalone public forms (`aanmelden.html`, `luisterlab.html`) bypass PIN checks.

**Frontend state:** Simple JS object in `public/modules/state.js`. No reactivity — handlers mutate state and manually re-render DOM.

**Feature structure:** Each feature has a handler module (`contactsHandler.js`, `lineupHandler.js`, etc.) and a corresponding HTML template in `public/modules/templates/`. Templates are injected as modals at runtime.

**API wrapper:** All frontend fetch calls go through `public/modules/api.js`, which attaches the PIN header automatically.

### Google API Integrations

| Service | Used for |
|---------|----------|
| Google Sheets | Artist contacts, performance lineups, LuisterLab signups |
| Google Drive | Scanning photo folders, uploading LuisterLab band/artist photos |
| Google People (Contacts) | Importing and syncing contacts from Google Contacts |

Credentials: Google OAuth2 Refresh Token (standard for Drive and Contact Sync, fallback Service Account for Sheets).

### Environment Variables

```
SPREADSHEET_ID                # Main contacts Google Sheet ID
SPEELSCHEMA_SPREADSHEET_ID    # Lineups Google Sheet ID
LUISTERLAB_DRIVE_FOLDER_ID    # Google Drive Folder ID for uploaded artist photos
BREVO_API_KEY                 # Brevo — newsletters AND transactional photo/notification emails
APP_PIN                       # Admin app authentication PIN
PORT                          # Default 3000
NOTIFICATION_EMAIL            # Email for new signup notifications (e.g. openmicamare@gmail.com)
EMAIL_USER                    # Sender address — info@haagseopenmic.nl or nieuwsbrief@haagseopenmic.nl
GOOGLE_OAUTH_CLIENT_ID        # Google Client ID for OAuth2 / Drive / Contacts Sync
GOOGLE_OAUTH_CLIENT_SECRET    # Google Client Secret for OAuth2 / Drive / Contacts Sync
GOOGLE_OAUTH_REDIRECT_URI     # Google OAuth2 Redirect Callback URL
GOOGLE_OAUTH_REFRESH_TOKEN    # Persistent Refresh Token for OAuth2 authentication
GOOGLE_SERVICE_ACCOUNT_EMAIL  # (Legacy/Fallback) Service account email for Google Sheets
GOOGLE_PRIVATE_KEY            # (Legacy/Fallback) Service account private key for Google Sheets
```

## Frontend Data Model

Artists loaded into `state.allArtists` on init. Sheet columns are in Dutch:
- `Voornaam` / `Achternaam` (first/last name)
- `Artiestennaam` (stage name)
- `E-mailadres`
- `Soort contact` (contact type - e.g., 'Artiest', 'Publiek')
- `Boekbaar` (TRUE/FALSE — bookable)
- `Favoriet Gijs`, `Favoriet Ro` (favorites per organizer)
- `Blacklist` (TRUE/FALSE)
- `Datum toegevoegd` (date added)
- `Profielfoto` (URL of the uploaded photo in Google Drive)
- `Omschrijving` (LuisterLab bio/description)
- `Live Link` (LuisterLab live demo URL)
- `Vrijwilliger` (TRUE/FALSE - volunteer interest)

Filtering is done client-side against `state.allArtists`.

## API Endpoints

```
POST /api/verify-pin
POST /api/public-subscribe          # Rate limited (5/hr/IP), public-facing
GET  /api/artists
POST /api/artists/add
POST /api/artists/edit
POST /api/artists/delete
POST /api/photos/scan
POST /api/photos/send-single        # Per-artist, chunked — avoids Railway request timeout
POST /api/mailing
POST /api/generate-mailing          # Generates AI mailing variants for Artists and Public
POST /api/speelschema/sheets
POST /api/speelschema/previous
POST /api/speelschema/current
POST /api/speelschema/save
POST /api/luisterlab                # Public signup form for LuisterLab, processes photo + 25-col sheet mapping
GET  /api/sync/auth-url             # Google Contacts OAuth2 initiation url
GET  /api/sync/callback             # Google Contacts OAuth2 callback handler
POST /api/sync/contacts             # Lists Google Contacts and compares with Sheet
POST /api/sync/import               # Appends selected contacts to Sheets
```

## Notes

- Code and comments are mixed Dutch/English (Dutch for domain language: artiesten, speelschema, boekbaar, etc.)
- The public signup pages are `public/aanmelden.html` and `public/luisterlab.html` — they are separate HTML files, not part of the PIN-protected SPA.
- Lineup feature uses HTML5 drag-and-drop with a mobile polyfill (`mobile-drag-drop`)
- Brevo handles both newsletter campaigns and individual/transactional emails (including photo emails and notifications). Outbound Gmail SMTP is blocked on Railway, so the Brevo HTTP API is used exclusively.

## iOS Safari Modal Scrolling — Lessons Learned

**The entry point is `main.js`, not `app.js`.** `public/app.js` is a dead file that is never loaded. All frontend JS logic belongs in `public/main.js`. Always verify via `index.html` which script is actually loaded before editing JS.

**iOS Safari flex + overflow scroll doesn't work reliably.** Using `flex-col` + `flex-1` + `overflow-y: scroll` on a modal body fails on iOS because `flex-1` doesn't always resolve to a concrete pixel height. iOS requires a *definite* height on the scroll container for `overflow-y: scroll` to activate.

**The working solution for scrollable modals on iOS:**
1. Give the modal card a real `height` (not just `max-height`) on mobile — use `height: 85dvh` via CSS.
2. Switch the card from `display: flex` to `display: grid` with `grid-template-rows: auto 1fr auto` on mobile. The `1fr` row gets a definite pixel height, which iOS Safari does understand.
3. Use `overflow-y: scroll` (not `auto`) on the `.modal-scroll` container.
4. Use `-webkit-overflow-scrolling: touch` and `overscroll-behavior: contain` on `.modal-scroll`.
5. For body scroll lock use the **fixed-body hack** in `main.js`: save `window.scrollY`, set `body { position: fixed; top: -scrollY; width: 100% }` on open, restore on close. Do NOT use `touch-action: none` on the body — iOS does not reliably honour the child `touch-action: pan-y` override, which breaks modal scroll entirely.

These rules are applied in `public/modals.css` (mobile media query) and `public/main.js` (`bindEvents`).
