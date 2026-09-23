# Bug Arena × VibeFarsi

This revision adds a framework-independent Persian-first UI layer inspired by the VibeFarsi component registry.

## What changed

- Added reusable RTL-aware `Button`, `Dialog`, and `Toast` primitives under `src/components/ui/vibefarsi/`.
- Added `src/styles/vibefarsi.css` mapped to Bug Arena's existing theme tokens. No Tailwind migration was introduced.
- Wrapped the application with `ToastProvider`.
- Applied the VibeFarsi-style button to authentication and settings flows.
- Added a Persian toast after a successful account settings save.
- Preserved the existing i18n, routing, database, state, theme, and code-editor architecture.
- Kept code/editor/terminal surfaces LTR while the Persian application shell remains RTL.

## Important

`dist/` and `.env` are intentionally excluded from this source package. Run:

```bash
npm install
npm run lint
npm run build
```

The VibeFarsi project is a free, source-based registry rather than a runtime component package. Its official docs recommend copying components into the project and state that the CLI targets Vite + Tailwind v4. This Bug Arena revision deliberately keeps its existing custom CSS architecture instead of forcing a Tailwind rewrite.

Official documentation:
https://vibefarsi.ir/docs
