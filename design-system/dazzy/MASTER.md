# DAZZY Design System

This file records the accepted aqua-orange mobile concept. The approved effect image and
`src/styles/tokens.scss` override generic style-database recommendations.

## Foundations

- Product: local companion services and user-organized activities.
- Tone: friendly, energetic, trustworthy, content-first.
- Canvas baseline: 390×844; fluid phone layout, centered max-width containers on wider screens.
- Typography: platform Chinese sans-serif (`PingFang SC`, `HarmonyOS Sans SC`, `Microsoft YaHei`).
- Primary: `#18c7c6`; deep primary: `#08aeb4`; primary soft: `#ddf8f7`.
- Price/action accent: `#ff6433`; deep price: `#e8501f`; success: `#21b66f`; warning: `#f5a623`; danger: `#ff4141`.
- Primary text: `#172126`; secondary: `#66737a`; tertiary: `#9aa4aa`.
- Page surface: `#f5f7f8`; card surface: `#ffffff`; subtle border: `#e9eef0`.
- Radius: 16/24/32rpx + full (999rpx). Shadows ship in three tiers (card/raised/floating) plus a brand-only CTA glow; shadows stay subtle and never replace hierarchy.
- Type scale (px design values): page title 20/600, module title 17/600, card title 15/600, body 14/400, caption 12/400, micro 10/400, price 18-24/700.
- Spacing scale: 4/8/12/16/24/32px (`$dz-space-1..6`); no off-scale bare values.
- Colors are token-only: hardcoded hex/rgba in page styles is a defect; near-brand variants map to the closest semantic token.

## Layout

- Use `dz-page`, `dz-page--with-tabbar`, `dz-safe-top`, and `dz-container`.
- Respect status-bar and bottom gesture safe areas.
- Phone widths use `rpx`; at 480–767px constrain phone content to 430px.
- At 768px and above use a centered 720px container until a dedicated tablet layout exists.
- Bottom navigation contains no more than five top-level destinations.

## Components

- Cards use white surfaces, subtle borders, and 16–24rpx radii.
- Primary CTA uses the aqua gradient; prices and transactional emphasis use orange.
- Interactive targets are at least 44×44pt and provide pressed feedback without layout shift.
- Use one consistent SVG outline icon family for structural/navigation icons.
- Loading, empty, error, disabled, and retry states are required for network-backed surfaces.

## Motion

- Motion is subtle and functional: 120ms press feedback, 180ms fades, 240ms panels, 280ms bottom sheets; never above 300ms.
- Tokens: `$dz-ease-out` `cubic-bezier(.23,1,.32,1)` for enter/exit, `$dz-ease-in-out` for on-screen moves, `$dz-ease-drawer` `cubic-bezier(.32,.72,0,1)` for sheets; never `ease-in` on UI.
- Animate only `transform` and `opacity`; scale starts at 0.95-0.97 with opacity 0, never `scale(0)`.
- High-frequency actions (tab switching, repeated taps) get no animation — instant state change only.
- Repeatable triggers use transitions, not keyframes; list entrances use `.dz-anim-stagger` (40ms per item, max 5).
- Pressed feedback uses `.dz-tappable` + `hover-class="dz-pressed"`; every motion ships with a `prefers-reduced-motion` fallback.
- Do not add continuous decorative animation.

## Avoid

- Generic orange-first palettes, cyberpunk fonts, newsletter layouts, or heavy aurora effects.
- Emoji/font glyphs as final structural icons.
- Hardcoded screen widths, hidden overflow that clips content, or controls without routes.
- Exposing exact provider/activity coordinates in public list screens.
