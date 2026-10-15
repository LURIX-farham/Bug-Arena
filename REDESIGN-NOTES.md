# BUG//ARENA — UI Redesign Notes (v2.0 "BLUEPRINT")

## What changed

A full art-direction pass across the existing product. No business logic, routes,
API contracts, stores, i18n keys, or backend behavior were modified. All changes
are visual/UX: design tokens, shared primitives, page stylesheets, and minimal
JSX presentational edits (icon swaps, class hooks).

### Identity

Built around the logo's deep navy (**#011631**, sampled from the original mark):

- **Dark theme** — layered navy mission-control surfaces (#050c1b → #0a1526 → #0f1d33),
  hairline borders, one disciplined electric-blue accent (#3d7eff) with a cyan
  data/live tone (#3fd5e4). No more black-terminal-with-green-text.
- **Light theme** — crisp drafting-paper (#f1f4f9 / #ffffff) with navy ink (#0a1a33)
  and a deeper electric blue (#1e56e0). Both themes share the same hierarchy.
- **Typography** — Space Grotesk (display, geometric like the mark), Inter (UI),
  JetBrains Mono (code/numerals/labels), Vazirmatn (Persian). Tabular numerals on
  all scores, timers and ranks.
- **Geometry** — sharp radii (2/4/6/8/12px), cut-corner CTAs echoing the logo's
  notch, corner registration ticks, blueprint-grid textures, `//` mono eyebrows.
- **Brand assets** — the original logo.png is untouched; transparent navy/white
  variants (logo-mark.png / logo-mark-white.png) were extracted from it so the
  mark sits correctly on both themes. New transparent favicon.

### Files rebuilt (by layer)

| Layer | Files |
|---|---|
| Tokens & base | `index.html`, `src/styles/variables.css`, `globals.css`, `components.css` |
| Brand | `src/components/brand/BrandLogo.jsx/.css`, `public/logo-mark*.png`, `favicon.png` |
| App shell | `src/styles/AppShell.css`, `AppSidebar/AppTopbar/AppMobileNav/GlobalSearch` (lucide icons) |
| Landing | `src/styles/Landing.css` (full rewrite), `Landing.jsx`, 4 section components |
| Pages | Home, Challenges, ChallengeDetails, Arena, Duel (lobby/room/toast), Leaderboard, Profile, Achievements, Analytics, Replays, Settings, Competitive, System, Auth, Admin + AdminShell, ComingSoon |

### Signature patterns (documented in DESIGN-SYSTEM.md)

- `.cut-corner` / `.cut-corner-sm` — logo-notch clip-path on primary CTAs and featured panels
- `.tick-frame` — corner registration marks on framed data panels
- `.bp-grid` / `.bp-grid-fine` — blueprint grid texture
- `.eyebrow-label` — mono `//` section labels
- `.tnum` — tabular numerals
- Active states use hard inset notches (`inset 3px 0 0 var(--primary)`), not glows
- Motion: 0.15/0.22/0.4s tokens, single easing pair, reduced-motion respected everywhere

### Fixes made along the way

- Landing `.replay-card` / `.challenge-card` / `.leaderboard-*` / `.timeline*` /
  `.mode-action` class collisions with app pages — landing showcase classes are now
  namespaced (`showcase-*`) so page styles can no longer be contaminated.
- BrandLogo mark sizes restored (images previously fell back to natural 1024px size)
  and theme-correct mark switching (white on dark, navy on light).
- AdminShell `.admin-shell-brand span` rule no longer crushes the logo wordmark.
- Challenges featured card: animated StarBorder beams replaced with a static accent
  edge (glow noise removed, layout bug fixed).
- ComingSoon (`.challenge-not-found`) was previously unstyled — now designed.
- Minified 1-line stylesheets (Competitive, System, Auth) expanded to readable,
  token-based CSS with logical (RTL-safe) properties.

### Verification

- `npm run lint` — 0 errors (1 pre-existing warning in Admin.jsx, logic untouched)
- `npm run build` — passes
- `npm run qa:challenges / qa:competitive / qa:database / qa:replays / qa:online` — all pass
- Browser QA (headless, mock API): landing/auth/home/challenges/details/arena/
  leaderboard/profile/achievements/analytics/replays/settings/compete/system/duel/admin
  rendered and inspected in dark, light, Persian-RTL, and 390px mobile viewports.
- Pre-existing uncommitted backend/working-tree changes in the upload were preserved as-is.
