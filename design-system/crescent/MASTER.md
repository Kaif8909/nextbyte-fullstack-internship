# CRESCENT / EventEase design system

This is the shared visual specification for the existing EventEase project, which uses the established CRESCENT frontend brand. Preserve that branding and the existing vanilla HTML, Tailwind CSS, custom CSS and ES6 module architecture.

## Source of truth

- `assets/css/design-system.css`: tokens, typography, reusable component refinements, focus/error states and responsive refinements.
- `assets/css/styles.css`: original page layouts, surfaces, motion, theme controls and component structure. Its 323 scattered font-size declarations were replaced by the shared type system.
- `assets/css/input.css` → `tailwind.css`: compiled layout utilities.
- `assets/js/components.js`: shared navigation, event cards, icons, footer and feedback markup.
- `assets/js/forms.js`: shared inline validation, hints and keyboard-accessible error summaries.

Keep these responsibilities separate. Add shared visual rules to the design system rather than duplicating page-specific values. Keep changes in all three themes: Light, Dark and System.

## Direction

Editorial, content-first event discovery: warm white, charcoal, vermilion, real photography, restrained 4–6px corners, strong hierarchy and generous spacing. The audit used ui-ux-pro-max's event-pattern, form-validation and HTML/Tailwind guidance. Its generic green palette and additional font suggestions were not adopted because the existing red brand and local Manrope font already provide a coherent identity. No extra runtime dependencies are needed.

## Token layers

Spacing primitives: 4, 8, 12, 16, 24, 32, 48 and 64px (`--space-1` through `--space-8`).

Semantic aliases: `--color-background`, `--color-surface`, `--color-text`, `--color-text-secondary`, `--color-accent`, `--color-on-accent`, `--color-error`. These resolve through the existing theme-aware variables. Component tokens include `--control-border`, `--radius-control`, `--radius-panel`, `--shadow-card` and `--focus-ring`.

| Role | Light | Dark |
| --- | --- | --- |
| Page | `#f7f6f2` | `#161815` |
| Surface | `#fbfaf7` | `#1e221c` |
| Primary text | `#20211f` | `#f2f1e9` |
| Secondary text | `#62655c` | `#b8bcae` |
| Accent text / focus | `#bd3025` | `#f47c70` |
| Control boundary | `#85897d` | `#77816e` |

The darker light-theme red keeps small accent text readable. Dark-theme red buttons retain a darker fill with white text; bright accent surfaces use dark text. QR symbols keep their white canvas.

## Typography

Use the included variable Manrope font; no remote font request is necessary.

| Role | Token / size | Usage |
| --- | --- | --- |
| Caption | `--text-caption`, 12px | Dates, categories, minor metadata, booking references |
| Small | `--text-small`, 14px | Navigation, helper copy, secondary controls |
| Body | `--text-body`, 16px | Prose, input values, form labels |
| Lead | `--text-lead`, 18px | Important short messages, numeric quantities |
| Card title | `--text-title`, 22px | Reusable event cards |
| Section title | 28–42px, fluid | Section hierarchy |
| Display | Contextual fluid scale | Homepage and page titles |

Body line height is 1.65. Prose uses 1.7 and a maximum measure of 65 characters. Card titles use 1.35. Use normal tracking for prose and restrained negative tracking for headings. Prices and quantities use tabular figures. Wrap user content instead of truncating essential information. Trademark and decorative avatar initials are the only intentional smaller decorative text.

## Component contracts

**Event cards:** one reusable `card()` function on home, discovery and related-event sections. Photo, category badge, 44px favorite control, padded content, 12px metadata, 22px title link and readable location. The image link is a pointer convenience; the title provides the keyboard-accessible destination. Favorites announce pressed state and preserve focus after result updates.

**Navigation:** shared header, real current-page semantics, visible theme choice, 44px controls. At 1100px and below use the disclosure menu; opening moves focus to the first navigation link, Escape closes it and returns focus to the toggle. The toggle announces Open/Close menu. Keep My Tickets available inside the phone menu.

**Forms:** body-size labels and 16px input values; 52px text fields with distinct theme-aware boundaries. Provide hints only where useful. Validate on blur and after failed submit; correct inline errors as values change. Every inline error is connected with `aria-describedby` and each invalid control exposes `aria-invalid`. A failed submit focuses a linked error summary. Never move focus on every keystroke. Keep native constraints and all existing storage/availability checks.

**Tickets:** preserve transparent fee calculation, ten-ticket maximum, local inventory checks, demo consent, simulated payment choices, persisted booking snapshots and QR previews. Use a small quantity-change animation. Disabled inventory controls remain disabled.

**Themes:** apply before CSS to prevent a light flash. Native selects, option menus, dates, placeholders, autofill and file controls use the active theme. System follows live device changes. Do not invert photographs or QR codes.

## Interaction and accessibility

- Aim for 44px primary pointer targets; 8px spacing between adjacent controls.
- Focus rings are 3px, with 4px separation; text inputs also have a clear outline.
- Focusable content uses scroll margins to remain visible below the sticky header.
- Normal text uses at least 4.5:1 contrast; large text uses at least 3:1.
- Selected states expose `aria-current`, `aria-pressed`, `aria-expanded` or actual native control state.
- Discovery has a real section heading and announces its complete result count once, rather than reading the entire grid repeatedly.
- Use native select and dialog controls; preserve keyboard support and Escape.
- Inline errors and summaries supplement text, rather than relying on red alone.
- Do not introduce auto-rotating content, focus-stealing feedback or mandatory gesture interactions.

## Motion

Feedback: 160ms. Component/image reveals: 320ms. Prefer opacity, transform and color. Hover elevation is limited to 3px. The signature crescent intro is retained, runs once per tab session and has a fail-safe exit. Respect reduced motion for CSS, GSAP and quantity/image transitions.

## Responsive review

Check 360/375px phones, 768px tablets, 1024px laptops, 1440px desktops and phone landscape. Category controls wrap rather than hiding categories in a horizontal strip. At narrow widths, stack search controls, details panels, confirmation content and forms; preserve labels and readable text. Primary navigation changes at 1100px; existing layout breakpoints remain in place.

Before handing off, exercise search/reset, favorites with keyboard, menu/Escape, invalid form recovery, mixed-ticket checkout, refreshed My Tickets and organizer image creation. Do not claim that a computed contrast scan certifies every image overlay, browser-native popup or assistive technology.
