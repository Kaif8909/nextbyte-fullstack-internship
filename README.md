# CRESCENT — make room for the moment

A responsive event discovery and demo ticket-booking system, now with a Node.js REST API and SQLite persistence, built on the original EventEase project. Eight pages, 22 fictional experiences across ten categories, local photography, original SVG branding, and an animated crescent introduction.

## Run locally (Week 3)

**Requirements:** Node.js **22.13+** (Node.js 22.23 works on Windows). This version uses Node's native SQLite module. Node 22 may show an `ExperimentalWarning` about SQLite; it is expected. You do not need to install Express or a separate database server.

Open the project folder in VS Code and run:

```powershell
node --version
npm.cmd run dev
```

Then visit **http://localhost:3000** to use the frontend with the backend. To confirm the server is running, visit **http://localhost:3000/api/health** or **http://localhost:3000/api/events**.

**Do not use Live Server for Week 3 testing.** Live Server hosts only static files, so it cannot handle the `/api/*` routes. Press `Ctrl + C` in the terminal to stop the Node server.

Run automated tests with:

```powershell
npm.cmd test
```

The SQLite database is created automatically in `server/data/eventease.sqlite` and is excluded from Git. Stop the server before moving or deleting the database files. Do not commit real attendee details.

## Pages and working interactions

| Page | Experience |
| --- | --- |
| `index.html` | Intro animation, three selectable hero features, search and location picker, featured and trending events, all ten categories, curated collections, weekly picks, organizer invitation, demo newsletter |
| `events.html` | Live text search; category, city, next 7/30 days, maximum price, free/paid and saved-only filters; date, price and popularity sorting; URL state; empty-state reset |
| `event.html?id=after-hours` | Event photography, organizer, schedule, highlights, ticket availability, initial quantity, estimated total, share/copy link, related events |
| `tickets.html?id=after-hours` | Early Bird, General Admission and VIP selection; remaining quantities; maximum ten tickets per booking; live subtotal, rounded 5% fee, and total |
| `checkout.html` | Validated attendee details, two simulated payment choices, explicit demo consent and submission to the backend |
| `confirmation.html?ref=...` | Saved booking summary, customer information, unique reference and a standards-based QR code containing the demo reference |
| `my-tickets.html` | Upcoming and past bookings, ticket previews in a keyboard-accessible native dialog, QR codes, persistent bookings |
| `organizer.html` | Validated event creation via backend, local cover preview/compression, category, venue, date, capacity and price; newly created events appear in Discover |

`register.html` and `success.html` remain as entry points to the new ticket flow. Original numeric EventEase event IDs are no longer part of the new catalog.

All sample events are fictional and dated in November–December 2026. Times use Asia/Karachi and amounts use PKR. Event dates are fixed so booked dates remain stable and completed events naturally move to Past memories. The original Week 1/Week 2 planning documents remain in `docs/`; the previous README is preserved as `docs/EventEase-original-README.md`.

## Design system and accessibility

The ui-ux-pro-max audit introduced a shared readable type scale, accessible theme colors, reusable event cards, 44px controls, responsive keyboard navigation and linked inline validation for checkout and organizer forms. See [design-system/crescent/MASTER.md](design-system/crescent/MASTER.md) for component specifications and [docs/ui-ux-audit.md](docs/ui-ux-audit.md) for findings, changes and executed checks.

`assets/css/design-system.css` owns shared tokens and typography; `styles.css` retains layout and original art direction. `assets/js/forms.js` provides progressive form validation without changing booking or local-storage behavior.

## Appearance

Use the theme selector in the top navigation to choose **Light**, **Dark**, or **System**. System is the default and follows your device appearance, including live changes. Your choice is remembered in `crescent.theme.v1` and applied before the stylesheet loads to avoid a light flash. The selector is available on every page and on mobile.

## Week 3: REST API reference

All endpoints use `http://localhost:3000` and return JSON with `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. **POST** requests must include `Content-Type: application/json` (an optional charset parameter is accepted). The service accepts bodies up to 64 KiB (65,536 bytes); the body must be a UTF-8 JSON object, not an array, scalar or null. Dates are strings such as `2099-12-15T19:00:00+05:00`. All ticket amounts are **PKR** integers; they are demo values, not real payments.

The same Node process serves the HTML frontend at `/` and its `/assets/*` files with GET or HEAD. Run only `npm.cmd run dev` for Week 3; the default VS Code task also uses this command. No Python server or Live Server is needed. `PORT` overrides the default 3000 and `DB_PATH` overrides the database path; environment variables must be set in the shell (the server does not automatically load `.env` files).

| Method | Endpoint | Inputs | Success | Common failures |
| --- | --- | --- | --- | --- |
| `GET` | `/api/health` | None | `200` server health | `500` internal error |
| `GET` | `/api/events` | Optional `q`, `city`, `category` query strings | `200` `{ "events": [...], "count": 22 }` | `500` internal error |
| `GET` | `/api/events/:id` | Event slug, e.g. `after-hours` | `200` `{ "event": {...}, "tickets": [...] }` | `404` event not found |
| `POST` | `/api/events` | JSON event details (see below) | `201` `{ "event": {...} }` | `400` invalid JSON, `422` invalid fields |
| `POST` | `/api/events/:id/registrations` | JSON `full_name`, `email` | `201` with registration ID | `404` event missing, `409` duplicate/full/ended, `422` invalid fields |
| `POST` | `/api/bookings` | JSON event ID, ticket items, customer, payment, consent | `201` `{ "booking": {...} }` | `404` event missing, `409` sold out/ended, `422` invalid fields |
| `GET` | `/api/bookings/:reference` | Random booking reference | `200` `{ "booking": {...} }` | `404` booking missing |

**GET `/api/events` example:** `http://localhost:3000/api/events?city=Karachi&category=Music`

Query values are trimmed and lowercased. `q` is truncated to 100 characters and performs a substring search over title, description, city and venue. `city` and `category` are truncated to 70 characters and match exactly, ignoring case. Filters intersect; empty filters are ignored and unknown query parameters are ignored. Results are ordered by date ascending, then title ascending, without pagination. No matches returns `200` with `{ "events": [], "count": 0 }`.

Read requests, usable in PowerShell:

```powershell
curl.exe http://localhost:3000/api/health
curl.exe "http://localhost:3000/api/events?q=music&city=Karachi&category=Music"
curl.exe http://localhost:3000/api/events/after-hours
curl.exe http://localhost:3000/api/bookings/CR-0123456789ABCDEF0123456789ABCDEF
```

Health returns `{ "status": "ok", "database": "sqlite", "demo": true }`. This is a process health response, not a database integrity check. Event detail returns the event plus three ticket pools, each with `id`, `name`, `price`, `capacity` and `remaining`. Event objects contain `id`, `title`, `description`, `category`, `city`, `venue`, `date`, `organizer`, `price`, `capacity`, `image`, `popularity`, `duration`, `highlights` and `schedule`.

Routes and methods must match exactly (no trailing slash). No update or delete endpoints are implemented. Known endpoints reject unsupported methods with `405`; unknown routes return `404`. API HEAD and OPTIONS requests have no special handling and are not supported. The server does not enable cross-origin API access.

**POST `/api/events` request:**

```json
{
  "title": "New Community Meetup",
  "description": "A practical workshop for beginners learning web development.",
  "category": "Technology",
  "city": "Karachi",
  "venue": "Community Center Karachi",
  "organizer": "EventEase Club",
  "date": "2099-12-15T19:00:00+05:00",
  "capacity": 50,
  "price": 1500
}
```

All listed event fields are required. Successful creation returns `201`, `{ "event": { ... } }`, and a `Location: /api/events/host-<16 lowercase hex digits>` header. The server generates the ID and defaults `image` to `assets/images/hero.jpg`, `popularity` to `0`, `duration` to `3 hours`, `highlights` to `["Independent community experience"]` and `schedule` to `[]`. Extra input fields, including a supplied ID or image, are ignored.

Event validation (`422 VALIDATION_ERROR`):

| Field | Rule |
| --- | --- |
| `title` | String, 5–100 characters after trimming |
| `description` | String, 25–1,800 characters after trimming |
| `city` | String, 2–70 characters after trimming |
| `venue` | String, 3–120 characters after trimming |
| `organizer` | String, 2–100 characters after trimming |
| `category` | Exactly one of `Music`, `Concerts`, `Festivals`, `Technology`, `Business`, `Sports`, `Food`, `Arts`, `Workshops`, `Nightlife` (case sensitive) |
| `capacity` | JSON integer from 1 through 100,000; numeric strings are rejected |
| `price` | JSON integer from 0 through 1,000,000; numeric strings are rejected |
| `date` | Must match `YYYY-MM-DDTHH:mm:ss±HH:mm`, be parseable by JavaScript, and be later than the server clock; `Z`, fractional seconds and missing offsets are rejected |

Validated text fields are stored trimmed. Date validation uses `Date.parse`, not a separate strict calendar validator.

**POST `/api/events/:id/registrations` request:**

```json
{ "full_name": "Demo Attendee", "email": "demo@example.com" }
```

Successful registration response (`201`):

```json
{ "registration_id": 1, "event_id": "after-hours", "full_name": "Demo Attendee", "email": "demo@example.com", "message": "Registration successful" }
```

The ID and event ID above are illustrative. Use a future event with available seats. A registration consumes one place without creating a booking or payment. Names accept `full_name` or `name`; `full_name` takes precedence unless null or absent. A duplicate normalized email on the same event returns `409 DUPLICATE_REGISTRATION`. Registrations and bookings share total capacity; registrations consume available general seats first, then early, then VIP. Full events return `409 EVENT_FULL`; ended events return `409 EVENT_ENDED`. There is no registration lookup endpoint.

**POST `/api/bookings` request:**

```json
{
  "eventId": "creative-retreat",
  "items": [{ "id": "early", "quantity": 2 }, { "id": "vip", "quantity": 1 }],
  "customer": { "name": "Demo Attendee", "email": "demo@example.com", "phone": "+92 300 1234567" },
  "payment": "demo-card",
  "consent": true
}
```

Supported ticket IDs are `early`, `general`, and `vip`; payment can be `demo-card` or `demo-wallet`. The server determines prices, checks stock and returns a `booking` object containing its secure random reference, calculated totals, selected items and demo status. Bookings for past events return `409`.

Person validation applies to registrations and `booking.customer`:

| Field | Rule |
| --- | --- |
| `full_name` or `name` | String, 2–100 characters after trimming; returned validation field is `name` |
| `email` | String, maximum 150 characters before normalization, matching `^[^\s@]+@[^\s@]+\.[^\s@]+$`; surrounding whitespace is rejected; stored lowercase |
| `phone` | Required only for bookings; optional leading `+`, followed by 7–25 characters consisting of digits, whitespace, `(`, `)`, `.`, `-`; at least 7 digits; stored trimmed. The optional `+` is additional to the regex's 7–25 character range |

Booking validation additionally requires:

- `customer` must be an object. Its validation runs first; customer errors are returned before the remaining booking fields are checked.
- `eventId` must be a string with 1–80 characters after trimming for validation. Lookup uses the original value, so send the exact ID without spaces.
- `items` must be an array containing 1–3 objects. Each item must have a unique `id` of `early`, `general` or `vip` and a JSON integer `quantity` of 1–10. The sum of quantities cannot exceed 10.
- `payment` must be exactly `demo-card` or `demo-wallet`; `consent` must be the JSON boolean `true`.
- The event must exist, be in the future, and have enough remaining tickets in every requested pool. Bookings do not enforce unique customer emails.

Extra request fields are ignored. Submitted prices, totals and fees are ignored. Early Bird price is `Math.round(event.price * 0.8)`, General Admission is `event.price`, and VIP is `Math.round(event.price * 1.75)`. Early capacity is `min(20, capacity)`; VIP is `min(15, max(0, capacity - 20))`; General gets the remainder. Subtotal is the sum of server prices times quantities; fee is `Math.round(subtotal * 0.05)`; total is subtotal plus fee.

Booking creation returns `201` with `Location: /api/bookings/CR-<32 uppercase hex digits>`. Both creation and lookup return `{ "booking": { ... } }`, with these fields: `id`, `eventId`, the full `event`, `items` (`id`, `name`, `quantity`, `price`), `subtotal`, `fee`, `total`, `customer` (`name`, `email`, `phone`), `payment`, `createdAt` (UTC ISO string) and `demo: true`. Keep the returned reference exactly: the lookup route accepts `CR-` followed by 32 hex characters, but SQLite reference lookup is case sensitive. A malformed reference returns `404 NOT_FOUND`; a well-formed nonexistent reference returns `404 BOOKING_NOT_FOUND`.

This PowerShell example creates a future event, registers one attendee, books tickets, and retrieves the booking. It writes demo records to the database:

```powershell
$base = 'http://localhost:3000'
$eventBody = @{
    title = 'New Community Meetup'
    description = 'A practical workshop for beginners learning web development.'
    category = 'Technology'; city = 'Karachi'; venue = 'Community Center Karachi'
    organizer = 'EventEase Club'; date = '2099-12-15T19:00:00+05:00'
    capacity = 50; price = 1500
} | ConvertTo-Json
$created = Invoke-RestMethod "$base/api/events" -Method Post -ContentType 'application/json' -Body $eventBody
$eventId = $created.event.id
$registrationBody = @{ full_name = 'Demo Attendee'; email = 'registration@example.com' } | ConvertTo-Json
Invoke-RestMethod "$base/api/events/$eventId/registrations" -Method Post -ContentType 'application/json' -Body $registrationBody
$bookingBody = @{
    eventId = $eventId
    items = @(@{ id = 'early'; quantity = 2 }, @{ id = 'vip'; quantity = 1 })
    customer = @{ name = 'Demo Attendee'; email = 'demo@example.com'; phone = '+92 300 1234567' }
    payment = 'demo-card'; consent = $true
} | ConvertTo-Json -Depth 5
$createdBooking = Invoke-RestMethod "$base/api/bookings" -Method Post -ContentType 'application/json' -Body $bookingBody
Invoke-RestMethod "$base/api/bookings/$($createdBooking.booking.id)"
```

For this example the booking subtotal is `5025`, fee `251` and total `5276` PKR. IDs and creation timestamps vary.

**Consistent error response:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the submitted fields.",
    "details": [{ "field": "email", "message": "Enter a valid email (maximum 150 characters)." }]
  }
}
```

Status codes: `200` retrieved successfully; `201` created; `400` malformed JSON; `404` missing resource; `405` unsupported HTTP method; `409` duplicate, ended, or full event; `413` request too large; `415` incorrect content type; `422` valid JSON with invalid fields; `500` internal server error. Errors use the same `error.code` and `error.message` structure. Only validation errors include `error.details`.

Complete application error catalog (messages below are the response's `error.message`):

| HTTP | `error.code` | Message / condition |
| --- | --- | --- |
| 400 | `INVALID_JSON` | `Provide a valid JSON object.` — malformed JSON, invalid UTF-8, array, scalar or null |
| 400 | `INVALID_PATH` | `Invalid URL encoding.` — malformed encoding in a static-file path |
| 404 | `EVENT_NOT_FOUND` | `The requested event does not exist.` |
| 404 | `BOOKING_NOT_FOUND` | `No booking was found for that reference.` |
| 404 | `NOT_FOUND` | `The requested API endpoint does not exist.` for unmatched API routes; `File not found.` for disallowed/missing static files |
| 405 | `METHOD_NOT_ALLOWED` | `Use GET for this endpoint.` or `Use POST for this endpoint.`; static routes use `Only GET and HEAD are supported for static files.` |
| 409 | `EVENT_ENDED` | `This event has already ended.` |
| 409 | `DUPLICATE_REGISTRATION` | `This email is already registered for the event.` |
| 409 | `EVENT_FULL` | `No registration places remain.` |
| 409 | `TICKETS_UNAVAILABLE` | `Not enough Early Bird tickets remain.` (or `General Admission` / `VIP Experience`) |
| 413 | `PAYLOAD_TOO_LARGE` | `JSON payload must be 64 KB or less.` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | `Send application/json.` |
| 422 | `VALIDATION_ERROR` | `Please correct the submitted fields.` plus field-specific `details` |
| 500 | `INTERNAL_ERROR` | `An unexpected server error occurred.` for uncoded internal errors; underlying runtime errors with a `code` may expose that code with the same generic message |

All three POST endpoints can return `400`, `413`, `415`, `422` and `500`; event registration and booking can additionally return `404` and `409`. Every recognized API endpoint can return `405` for an unsupported method and `500` for unexpected failures. A 405 response includes an `Allow` header (the current static handler advertises only `GET` despite also accepting HEAD). Malformed percent encoding in event ID route parameters currently produces `500`, whereas static-path decoding produces `400 INVALID_PATH`.

Validation detail messages for bounded strings are `Use <min> to <max> characters.`. Other messages are `Choose a supported category.`, `Use a whole number from 1 to 100000.`, `Use a whole number from 0 to 1000000.`, `Enter a future ISO 8601 date with a timezone offset.`, `Enter a valid email (maximum 150 characters).`, `Enter a valid phone number (7 to 25 characters).`, `An object is required.` (field `customer`), `Valid event ID required.`, `Select a supported demo payment method.`, `Confirm this is a demo booking.`, `Select 1 to 3 ticket types.`, `Use a unique valid ticket type and quantity from 1 to 10.` (field `items[index]`), and `Maximum 10 tickets per booking.`. A non-object HTTP body is rejected with `400 INVALID_JSON` before field validation. Multiple invalid fields are collected except for the customer-first behavior described above.

Examples of errors without field details:

```json
{ "error": { "code": "EVENT_NOT_FOUND", "message": "The requested event does not exist." } }
```

```json
{ "error": { "code": "DUPLICATE_REGISTRATION", "message": "This email is already registered for the event." } }
```

```json
{ "error": { "code": "INVALID_JSON", "message": "Provide a valid JSON object." } }
```

For example, `curl.exe -X POST http://localhost:3000/api/events -H "Content-Type: application/json" --data-raw '{oops'` returns the last response with HTTP 400.

The database uses atomic SQLite transactions to prevent booking two people into the last remaining seat at the same time. See [Week 3 backend documentation](docs/week3-backend.md) for testing and limitations.

## Development

Only HTML5, Tailwind CSS, custom CSS and vanilla ES6 JavaScript run in the browser; Node.js handles the backend. GSAP supplies the entrance animations; the small vendored QR encoder creates actual QR symbols. There is no frontend framework or application build step.

```sh
npm install
npm run build:css
npm run watch:css
npm run dev
npm test
```

On Windows systems where PowerShell blocks the npm script shim, use `npm.cmd` instead of `npm`.

`assets/css/input.css` is the Tailwind source; `tailwind.css` is its committed, generated output. Run `build:css` after changing Tailwind utility classes. Custom art direction, component details, breakpoints and reduced-motion rules live in `styles.css`.

```text
index.html / events.html / event.html / tickets.html
checkout.html / confirmation.html / my-tickets.html / organizer.html
assets/
  css/          Tailwind source, compiled utilities, design system
  js/
    theme.js    Early theme initialization, saved preference and system appearance
    main.js     Shared shell, page routing and global interactions
    data.js     Catalog, ticket pools, availability and date/price formatting
    components.js  Escaped reusable markup, icons, cards, feedback
    home.js     Homepage and selectable hero stories
    events.js   Marketplace controls and URL state
    filters.js  Pure event filtering and sorting
    booking.js  Details, quantities, checkout, confirmation and ticket management
    organizer.js   Demo event creation and cover preview
    storage.js  Storage keys, guarded reads/writes and favorites
    animations.js  Session intro, GSAP entrances and motion preferences
  images/       Local event images and source manifest
  fonts/        Local Manrope font and license
  icons/        Original crescent SVG favicon
  vendor/       Browser-ready GSAP and QR encoder
 tests/         Native Node.js tests for pricing, filters and inventory
 docs/          Original project planning, QA notes and screenshots
```

## Demo data and storage

The backend seeds **22 fictional events** into SQLite and stores new events, simple event registrations, demo bookings and ticket quantities. The server calculates ticket prices and checks capacity atomically.

The existing frontend also retains a local cache of bookings for its confirmation and My Tickets displays, while favorites and newsletter demo entries remain in `localStorage`. The checkout and organizer forms submit new records to `/api` routes. Event discovery begins with bundled demo data; server-created events from another browser are available through the events API but the frontend has not fully transitioned to API-driven discovery. Ticket counts shown in the browser may therefore lag behind server inventory; the API enforces remaining stock before accepting a booking.

The introductory animation uses `sessionStorage`. Cover images uploaded through the organizer page are previews stored in that browser; server-created events use a default image. Original `eventease_*` data is left untouched.

No money is charged, no real card details are collected, no ticket is valid for admission, and no email is sent. This backend is **for local coursework only**: anyone with access to the server can create events or retrieve bookings by reference. Do not deploy it publicly with real personal information. Production requires identity and organizer permissions, rate limiting, secure image uploads, compliant payment integration, and stronger protections for attendee data.

## Verification

`npm test` runs frontend and backend tests, including seven frontend tests covering mixed-ticket totals and fee rounding, catalog coverage, intersecting filters and sorting, ticket pool capacities, untrusted cart prices, invalid/duplicate quantities, overbooking and expired events.

Browser QA exercised discovery, empty-state resets, favorites, a mixed-ticket booking, refresh persistence, the ticket dialog/QR, organizer image upload and event discovery. All eight main routes were inspected at 360, 768, 1024 and 1440px, and checkout overflow discovered during testing was fixed. See `docs/qa.md` for the verification record and screenshots.

## Assets and references

Photos are downloaded from Unsplash; exact source endpoints are listed in `assets/images/sources.json`. They illustrate fictional experiences and do not depict or endorse the named venues. See the [Unsplash license](https://unsplash.com/license).

Manrope is distributed under the SIL Open Font License; its license is included in `assets/fonts/OFL.txt`. GSAP and the QR encoder retain their upstream license notices in `assets/vendor/`. GSAP’s terms are available at [GSAP Standard License](https://gsap.com/standard-license/).

The design research considered category/location navigation from Ticketmaster, city-first curation from Fever, and editorial typography and imagery from Awwwards. These informed general patterns only; CRESCENT uses its own layouts and branding. Direct access to Eventbrite and DICE was blocked during this session.
