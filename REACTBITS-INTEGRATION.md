# Bug Arena × React Bits

## Dashboard (primary)
| Location | Component | Effect |
|----------|-----------|--------|
| **Home** – hero background | Aurora + **DotGrid** | WebGL wash + interactive dot field (dots ignite near the pointer, click ripple) |
| **Home** – hero greeting | BlurText + GradientText | Entrance animation on eyebrow/body, animated gradient on player name |
| **Home** – hero metrics | AnimatedCounter | Count-up score, static rank # + solved chips beside it |
| **Home** – quick actions | **Magnet** | Magnetic pull on all three CTA buttons |
| **Home** – identity card | SpotlightCard + AnimatedCounter | Mouse spotlight + count-up level/XP/streak |
| **Home** – leaderboard strip | **LogoLoop** + **ShinyText** | Seamless live leaderboard marquee fed by real player data, shimmer on the LIVE chip |
| **Home** – stat rail | SpotlightCard + AnimatedCounter | One grouped strip (4 metrics, hairline dividers, context micro-bars) |
| **Home** – next challenge | **StarBorder** + **ShinyText** | Orbiting border beams signal the "up next" card; shimmer on READY badge |
| **Home** – performance | AnimatedCounter + draw-in chart | Count-up rating + SVG line/area draw on scroll-in + pulse dot |
| **Home** – recent submissions | **AnimatedList** | Staggered fade/slide reveal of match rows |
| **Challenges** – challenge cards | SpotlightCard as={Link} | Spotlight on grid cards |
| **Analytics** – metric tiles + panels | SpotlightCard | Spotlight on stats |
| **Profile** – stat tiles | SpotlightCard | Spotlight on XP/score tiles |
| **Topbar** – profile chip | SpotlightCard as="button" | Spotlight on avatar menu trigger |

## Landing (secondary)
| Location | Component | Effect |
|----------|-----------|--------|
| Hero background | Aurora | WebGL aurora (hex colorStops only — see notes) |
| Hero titles | BlurText + GradientText | Entrance animation |
| Why Bug Arena comparison | SpotlightCard | Spotlight cards |

## Files
- `src/components/reactbits/*` — Aurora, BlurText, GradientText, SpotlightCard,
  AnimatedCounter, **DotGrid, Magnet, StarBorder, ShinyText, AnimatedList, LogoLoop**
- Dependencies: `motion`, `ogl` (no new packages added)

## Notes
- Terminal / code editor surfaces stay clean (no heavy effects).
- `prefers-reduced-motion` disables spotlights, aurora, dot-grid physics,
  marquee, shimmer, magnet and list staggers.
- DotGrid listens on `window` so it works behind overlay layers; it is
  DPR-aware and pauses rendering when off-screen or the tab is hidden.
- LogoLoop forces `dir="ltr"` internally so the marquee math stays correct
  inside RTL pages; the strip itself mirrors with the page direction.
- **Aurora colorStops must be HEX strings** (`#7cff6b`), not `rgba()` — the
  component re-parses stops with ogl's `Color` every frame and rgba() fails
  silently (warning spam + wrong colors). Home was fixed accordingly.
- VibeFarsi layer is untouched.
