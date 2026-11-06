# CRESCENT — make room for the moment

A complete, responsive event discovery and ticket-booking frontend built directly on the original EventEase project. Eight pages, 22 fictional experiences across ten categories, local photography, original SVG branding, and an animated crescent introduction.

## Run locally

Open this folder in VS Code, right-click `index.html`, and select **Open with Live Server**. No installation or build is required: the compiled Tailwind stylesheet, font, images, GSAP, and QR encoder are included.

Alternatively:

```sh
python -m http.server 8000
```

Visit `http://localhost:8000`. Use an HTTP server rather than opening HTML through `file://`, because the application uses JavaScript ES modules.

## Pages and working interactions

| Page | Experience |
| --- | --- |
| `index.html` | Intro animation, three selectable hero features, search and location picker, featured and trending events, all ten categories, curated collections, weekly picks, organizer invitation, demo newsletter |
| `events.html` | Live text search; category, city, next 7/30 days, maximum price, free/paid and saved-only filters; date, price and popularity sorting; URL state; empty-state reset |
| `event.html?id=after-hours` | Event photography, organizer, schedule, highlights, ticket availability, initial quantity, estimated total, share/copy link, related events |
| `tickets.html?id=after-hours` | Early Bird, General Admission and VIP selection; remaining quantities; maximum ten tickets per booking; live subtotal, rounded 5% fee, and total |
| `checkout.html` | Validated attendee details, two simulated payment choices, explicit demo consent and final availability checks |
| `confirmation.html?ref=...` | Saved booking summary, customer information, unique reference and a standards-based QR code containing the demo reference |
| `my-tickets.html` | Upcoming and past bookings, ticket previews in a keyboard-accessible native dialog, QR codes, persistent bookings |
| `organizer.html` | Validated event creation, image upload/preview/compression, category, venue, date, capacity and price; created events appear in Discover |

`register.html` and `success.html` remain as entry points to the new ticket flow. Original numeric EventEase event IDs are no longer part of the new catalog.

All sample events are fictional and dated in November–December 2026. Times use Asia/Karachi and amounts use PKR. Event dates are fixed so booked dates remain stable and completed events naturally move to Past memories. The original Week 1/Week 2 planning documents remain in `docs/`; the previous README is preserved as `docs/EventEase-original-README.md`.

## Design system and accessibility

The ui-ux-pro-max audit introduced a shared readable type scale, accessible theme colors, reusable event cards, 44px controls, responsive keyboard navigation and linked inline validation for checkout and organizer forms. See [design-system/crescent/MASTER.md](design-system/crescent/MASTER.md) for component specifications and [docs/ui-ux-audit.md](docs/ui-ux-audit.md) for findings, changes and executed checks.

`assets/css/design-system.css` owns shared tokens and typography; `styles.css` retains layout and original art direction. `assets/js/forms.js` provides progressive form validation without changing booking or local-storage behavior.

## Appearance

Use the theme selector in the top navigation to choose **Light**, **Dark**, or **System**. System is the default and follows your device appearance, including live changes. Your choice is remembered in `crescent.theme.v1` and applied before the stylesheet loads to avoid a light flash. The selector is available on every page and on mobile.

## Development

Only HTML5, Tailwind CSS, custom CSS and vanilla ES6 JavaScript run in the browser. GSAP supplies the entrance animations; the small vendored QR encoder creates actual QR symbols. There is no frontend framework or application build step.

```sh
npm install
npm run build:css
npm run watch:css
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

Bookings, selected tickets, favorites, created events and newsletter addresses are stored **only in this browser**, under `crescent.*.v1` keys. The introduction uses `sessionStorage` to run once per browser-tab session. Storage failures display feedback instead of reporting a successful booking. Original `eventease_*` data is left untouched.

Checkout does not request, process or save real card information. No money is charged, no email is sent, and every ticket and QR payload is explicitly marked as a demo that is **not valid for entry**. Uploaded organizer images are resized to a maximum width of 1200px and saved locally; browser storage limits still apply.

For production, add server-side identity and order storage, transactional inventory, payment-provider integration, signed tickets and QR validation, email delivery, organizer permissions, upload storage/moderation, and server-side input validation. Client storage is not a secure or shared database; availability checks apply to bookings in this browser only.

## Verification

`npm test` runs seven native Node tests covering mixed-ticket totals and fee rounding, catalog coverage, intersecting filters and sorting, ticket pool capacities, untrusted cart prices, invalid/duplicate quantities, overbooking and expired events.

Browser QA exercised discovery, empty-state resets, favorites, a mixed-ticket booking, refresh persistence, the ticket dialog/QR, organizer image upload and event discovery. All eight main routes were inspected at 360, 768, 1024 and 1440px, and checkout overflow discovered during testing was fixed. See `docs/qa.md` for the verification record and screenshots.

## Assets and references

Photos are downloaded from Unsplash; exact source endpoints are listed in `assets/images/sources.json`. They illustrate fictional experiences and do not depict or endorse the named venues. See the [Unsplash license](https://unsplash.com/license).

Manrope is distributed under the SIL Open Font License; its license is included in `assets/fonts/OFL.txt`. GSAP and the QR encoder retain their upstream license notices in `assets/vendor/`. GSAP’s terms are available at [GSAP Standard License](https://gsap.com/standard-license/).

The design research considered category/location navigation from Ticketmaster, city-first curation from Fever, and editorial typography and imagery from Awwwards. These informed general patterns only; CRESCENT uses its own layouts and branding. Direct access to Eventbrite and DICE was blocked during this session.
