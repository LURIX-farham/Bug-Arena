# BUG//ARENA — DESIGN SYSTEM v2.0 "BLUEPRINT"

This document is the binding visual contract for every page in the app.
The token layer (`src/styles/variables.css`), base layer (`globals.css`),
primitive layer (`components.css`), shell (`AppShell.css`) and landing
(`Landing.css`) are ALREADY redesigned. Your job is to bring the assigned
pages to this standard.

## Identity

The brand mark is a deep-navy geometric "broken B" (#011631) with an angular
notch. The UI must feel like the mark: **navy mission-control / drafting-board
precision** — layered navy surfaces, hairline structure, mono technical labels,
one disciplined electric-blue accent. NOT a black terminal with green text.
NOT purple AI gradients. NOT oversized rounded cards.

## Core tokens (variables.css — always use tokens, never raw hex)

| Role | Token | Dark value | Light value |
|---|---|---|---|
| Page bg | `--bg-primary` | #050c1b | #f1f4f9 |
| Card surface | `--bg-surface` | #0a1526 | #ffffff |
| Raised surface | `--bg-elevated` | #0f1d33 | #f6f8fc |
| Sunken (code bg area) | `--bg-sunken` | #030711 | #e8edf5 |
| Hairline border | `--border` | #1b2c48 | #d8dfea |
| Strong border | `--border-strong` | #2b4269 | #bcc8da |
| Subtle border | `--border-subtle` | #13223a | #e5eaf2 |
| Text primary | `--text-primary` | #e9f0fc | #0a1a33 |
| Text secondary | `--text-secondary` | #9cacc9 | #4a5a73 |
| Text muted | `--text-muted` | #67799b | #6e7f99 |
| Accent (electric blue) | `--primary` | #3d7eff | #1e56e0 |
| Accent soft bg | `--primary-soft` | rgba 0.10 | rgba 0.08 |
| Cyan data/live | `--secondary` | #3fd5e4 | #0a93b4 |
| Periwinkle | `--tertiary` | #92a5ff | #4c5fd6 |
| Success | `--success` | #35d49e | #0c9d6e |
| Warning | `--warning` | #ffb454 | #b96c0e |
| Danger | `--danger` | #ff5c7a | #d93a5e |
| Info | `--info` | #55a8ff | #1673d2 |
| Brand navy | `--navy` | #011631 (both themes) | |
| Blueprint grid line | `--grid-line` | rgba(122,162,247,.055) | rgba(2,22,49,.05) |

RGB triplets exist for every color: `--primary-rgb`, `--danger-rgb`, etc.
Use `rgba(var(--primary-rgb), 0.2)` for tints. Soft backgrounds exist:
`--primary-soft`, `--success-soft`, `--warning-soft`, `--danger-soft`, `--info-soft`.
Code surfaces: `--code-bg`, `--code-border`, `--code-text`, `--code-gutter`
(stay terminal-dark navy in BOTH themes — do not lighten them in light mode).

## Typography

- Display/headings: `var(--font-display)` (Space Grotesk; falls back to
  Vazirmatn for Persian). Tight tracking: `letter-spacing: -0.02em … -0.03em`.
- UI/body: `var(--font-sans)` (Inter). Base 13px.
- Mono/technical/numbers: `var(--font-mono)` (JetBrains Mono). Use for:
  eyebrows, IDs, timers, scores, ranks, kbd, tags, table numerals.
  Scores/timers must have `font-variant-numeric: tabular-nums`.
- Persian: `var(--font-fa)` (Vazirmatn). `html[lang='fa']` rules handle the
  swap globally — do not add per-page Persian overrides except letter-spacing
  resets.
- Type scale tokens: `--text-xs 10 · --text-sm 11 · --text-base 13 · --text-md 14 ·
  --text-lg 16 · --text-xl 20 · --text-2xl 26 · --text-3xl 34 · --text-4xl 44 · --text-5xl 58`.

## Geometry

- Radius: `--radius-xs 2 · sm 4 · md 6 · lg 8 · xl 12`. NEVER use pill radii
  on cards/panels/inputs (badges keep sharp `--radius-xs`). Pills are banned
  except tiny status dots.
- Borders are hairlines (1px). Shadows are used sparingly for elevation
  (`--shadow-sm` cards at rest, `--shadow-md` hover/dropdowns, `--shadow-strong`
  modals). No colored glow spam; the only glow allowed is a subtle
  `rgba(var(--primary-rgb), .1-.2)` on primary actions / active dots.
- Signature motifs (globals.css utilities — compose them):
  - `.cut-corner` / `.cut-corner-tr` / `.cut-corner-sm` — the logo-notch
    clip-path. Reserve for PRIMARY CTAs, featured/rating panels, scoreboard
    highlights. (Note: clip-path clips box-shadow — don't combine on shadows.)
  - `.tick-frame` — corner registration marks on framed panels.
  - `.bp-grid` / `.bp-grid-fine` — blueprint grid texture (hero bands, empty
    states, CTA panels).
  - `.eyebrow-label` — mono uppercase label with `//` prefix.
  - `.tnum` — tabular numerals.
- Active/selected states: left notch bar `box-shadow: inset 3px 0 0 var(--primary)`
  or 2px accent underline/border — hard edges, not glows.
- RTL: use logical properties (`margin-inline-start`, `border-inline-start`,
  `inset-inline-end`, `text-align: start`). Existing rtl.css handles the shell.

## Hierarchy rules

1. One primary action per view: solid `--primary` bg, `--text-invert` text,
   optional cut-corner. Hover: `--accent-hover` + `--shadow-accent`.
2. Secondary: transparent, 1px `--border-strong`, text-primary. Hover: accent border/text.
3. Tertiary/ghost: text-secondary only, hover soft bg.
4. Danger: solid `--danger` (destructive only).
5. Surfaces: page = `--bg-primary`, cards = `--bg-surface` + 1px `--border`
   + `--radius-md`, nested/raised = `--bg-elevated`. Code/terminal = `--code-bg`.
6. Stat displays: value = mono/display font, large, tabular; label = mono
   uppercase 10px letterspaced `--text-muted` above or below.
7. Difficulty / severity color mapping stays: easy=`--success`,
   medium=`--warning`, hard=`--danger`.

## Motion

- Durations: `--duration-fast .15s` hovers, `--duration-base .22s` panels,
  `--duration-slow .4s` reveals. Easing `--ease-out` / `--ease-spring`.
- Interactive transitions: colors/transform/box-shadow only. Hover lifts ≤ 3px.
- No entrance animation on competitive elements (timer, submit). Respect the
  existing `@media (prefers-reduced-motion: reduce)` blocks — keep them.

## Hard rules

1. DO NOT change business logic, state, services, API calls, i18n keys, or
   route behavior. Restyle + minimal JSX class/structure changes only.
2. DO NOT remove features, sections, or existing i18n `t(...)` calls.
3. Keep every existing CSS class that JSX references working (you may add
   new classes; you may delete only dead CSS).
4. Both themes must work. Test mentally against BOTH palettes above; never
   hardcode hex except the two brand navy constants (#011631 / white mark).
5. RTL-safe: logical properties everywhere; no `left:`/`right:` for layout
   direction (except absolute decorations symmetric in both directions).
6. Code areas (`.arena-code-editor`, `pre`, `code`, test output) remain
   monospace + LTR. Existing `html[dir='rtl']` rules in globals.css must keep
   applying — do not rename those classes.
7. Icons: lucide-react only (`size={14-18} strokeWidth={1.75}`), replacing
   text glyphs where you touch JSX. Never mix emoji.
8. File hygiene: keep CRLF→LF as-is (files are LF now), keep CSS organized
   with section comments like existing files.
9. After editing, run `npx eslint <files>` on changed JSX files and make sure
   they pass.
