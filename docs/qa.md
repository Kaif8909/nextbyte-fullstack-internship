# CRESCENT verification record

Verified on 6 November 2026 using a local Python HTTP server and Chromium browser automation. These checks exercise a frontend demo; no real tickets or payments are involved.

## Executed checks

- Seven Node.js tests passed: mixed-ticket pricing and rounded 5% fees, all 22 event IDs and ten categories, combined filters/sorting, capacity allocation for small and large events, invalid or duplicate ticket quantities and client-price tampering, local overbooking checks, and expired-event rejection.
- Browser discovery: 22 seeded events; search and city selection; category filters; free-only results; free + Karachi intersection; descending price; next-seven-days filtering; zero-result reset; favorite save and saved-only filtering.
- Paid booking: two Early Bird tickets at PKR 3,600 plus one VIP at PKR 7,875. Subtotal PKR 15,075, rounded fee PKR 754, total PKR 15,829. Confirmation created reference `CR-40056B4C` and one QR SVG. The booking remained after refresh and opened in My Tickets; Escape closed the native ticket dialog.
- Free booking: Sunday Strides with the demo-wallet choice confirmed at PKR 0. Empty required fields blocked submission.
- Organizer: submitted a future event with capacity 8 and PKR 1,500 price, uploaded a local JPEG, verified its compressed preview, saved it, and found its card and image in Discover.
- Responsive checks: all eight routes at 360, 768, 1024 and 1440px. Checkout initially overflowed because text-field rules affected radio inputs; the selector was corrected and both affected widths passed again.
- All 23 event photos in the discovery QA session (22 catalog entries and one uploaded test event) loaded successfully. No failed HTTP responses or page exceptions occurred in the final discovery and free-checkout run.
- Browser inventory: a capacity-8 test event with eight booked Early Bird tickets correctly disabled additional tickets and checkout. A temporary past booking appeared in Past memories.
- Intro lifecycle: the SVG intro appeared on a fresh session, exited automatically, and did not repeat on the next page. Desktop and mobile filter toggles were checked against their computed visibility.
- Mobile: selectable hero story changed to 02/03; menu expanded and closed with Escape; advanced filters expanded; reduced-motion emulation removed the intro and disabled reveal animations.

## Issues fixed during verification

- An unescaped apostrophe in the initial event seed data prevented module parsing.
- Duplicate input/change handlers replaced the empty-state button during search-field blur, swallowing its first click. Filtering now listens to input changes once.
- A mobile hero caption overlapped the headline. The mobile caption now sits below the headline and its control has a touch-friendly size.
- Sticky navigation was constrained by its wrapper. The shared header wrapper now owns sticky positioning.
- Checkout radio inputs inherited full-width text-input styling and caused horizontal overflow.
- Text re-encoding introduced malformed punctuation in several files; the affected text was repaired and explicit UTF-8 handling restored.
- Event dates now remain fixed, and booked event snapshots remain stable if the catalog is changed later.

## Screenshot artifacts

- `screenshots/crescent-home-desktop.png`
- `screenshots/crescent-home-mobile.png`
- `screenshots/crescent-discover-desktop.png`
- `screenshots/crescent-confirmation-desktop.png`

Browser QA does not certify every browser, assistive technology, or payment system. Inventory is local to a browser. Authentication, real charges, delivery emails and scannable production entry passes require backend services.

## Theme update verification

- Light, Dark and System are available in the shared header, including at 360px.
- Explicit Dark survived refreshes and navigation; switching to Light restored the original white surfaces.
- With System selected, emulated device changes switched the page from Dark to Light while it remained open.
- All eight routes were checked in both Light and Dark at 360px and 1440px: 32 checks, no horizontal overflow or page exceptions. A temporary ticket fixture was removed after inspection.
- Dark homepage desktop/mobile and confirmation screenshots were visually reviewed. QR symbols retain a white background for readability.
- Existing seven Node.js regression tests passed; the Tailwind stylesheet compiled successfully.

## Form theme contrast fix

- Fixed the reported light-text-on-white native dropdown menu: all select options and groups now set both foreground and background from the active theme, with explicit selected and disabled states. Previously only the theme selector had option colors.
- Inputs and textareas now explicitly inherit the active color scheme; placeholder, autofill and file-upload button styling uses shared theme colors.
- Browser checks covered dropdowns on Home, Discover, Organizer, Event Details and Ticket Selection in Light and Dark (10 page/theme combinations). Computed option text contrast was at least 14.25:1; no contrast failures or page exceptions were reported.
- System appearance switched option backgrounds live from dark to light. City filtering and keyboard selection continued working, and the expanded filters had no horizontal overflow at 360px.
