---
name: Gabreal Dark Glass Design System
description: Covers the dark luxe aesthetic applied across the entire dashboard CSS — palette, surface treatment, animations, and component patterns.
---

# Dark Glass Design System

## Rule
The dashboard uses a dark luxe glass aesthetic. Never revert to light surface colors or the original warm peach palette.

**Why:** A full CSS overhaul converted the design from warm peach/light to dark espresso glass with amber gold accents.

**How to apply:** Any new component or CSS added to index.css must follow these values — dark surfaces, amber borders, glassmorphism blur, amber glow on hover.

## Key values
- Background: `#0C0906` (deep espresso) with animated radial gradient (bg-drift, 24s)
- Surface: `rgba(255,255,255,0.055)` — backdrop-filter blur(20px)
- Surface warm (amber tint): `rgba(232,160,64,0.09)`
- Border: `rgba(232,160,64,0.18)` — amber border standard
- Text: `#F5E8D0` / soft: `rgba(245,232,208,0.65)` / xsoft: `rgba(245,232,208,0.38)`
- Accent: `#E8A040` / dark: `#F5B84A`

## Animations (defined in :root CSS)
- `bg-drift` — body background drift (24s)
- `text-shimmer` — gradient text sweep (page greeting, cycle-theme)
- `glow-pulse` — green agent dots (2.2s)
- `amber-pulse` — Sage FAB glow (3s, stops on hover)
- `float-in` — card entrance animation

## Component patterns
- All cards: `backdrop-filter: blur(20px)`, amber border `rgba(232,160,64,0.18)`, hover lift + glow
- Buttons: dark glass base; `.btn-accent` = gradient gold (#E8A040→#F5B84A), text color #0C0906
- Status badges: dark glass with colored text (green=#80D8A0, amber=#E8A040, red=#F09090)
- Modals: `rgba(18,12,6,0.88)` bg + blur(32px), strong dark box-shadow + amber border
- Inputs: `rgba(255,255,255,0.06)` bg, focus ring = amber border 0.5 opacity + `box-shadow: 0 0 0 2px rgba(232,160,64,0.1)`
- Sage FAB: gradient gold + `animation: amber-pulse 3s` (stops on hover/open)
