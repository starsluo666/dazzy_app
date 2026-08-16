# DAZZY Design System

This file records the accepted aqua-orange mobile concept. The approved effect image and
`src/styles/tokens.scss` override generic style-database recommendations.

## Foundations

- Product: local companion services and user-organized activities.
- Tone: friendly, energetic, trustworthy, content-first.
- Canvas baseline: 390×844; fluid phone layout, centered max-width containers on wider screens.
- Typography: platform Chinese sans-serif (`PingFang SC`, `HarmonyOS Sans SC`, `Microsoft YaHei`).
- Primary: `#18c7c6`; deep primary: `#08aeb4`; primary soft: `#ddf8f7`.
- Price/action accent: `#ff6433`; success: `#21b66f`.
- Primary text: `#172126`; secondary: `#66737a`; tertiary: `#9aa4aa`.
- Page surface: `#f5f7f8`; card surface: `#ffffff`; subtle border: `#e9eef0`.
- Radius: 16/24/32rpx. Shadows remain subtle and must not replace hierarchy.

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

- Motion is subtle and functional, normally 150–300ms.
- Prefer opacity and transform; respect reduced-motion settings.
- Do not add continuous decorative animation.

## Avoid

- Generic orange-first palettes, cyberpunk fonts, newsletter layouts, or heavy aurora effects.
- Emoji/font glyphs as final structural icons.
- Hardcoded screen widths, hidden overflow that clips content, or controls without routes.
- Exposing exact provider/activity coordinates in public list screens.
