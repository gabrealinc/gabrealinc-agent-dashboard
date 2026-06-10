---
name: Gabreal design preference — warm peach light palette
description: Gabby explicitly prefers the original warm peach/cream light design. Do not apply dark mode.
---

# Design Preference

## Rule
Always use the warm peach/cream light palette. Do NOT redesign to dark mode unless Gabby explicitly asks for it.

**Why:** A dark luxe glass redesign was applied and then immediately reverted — Gabby prefers the original warm peach, light orange-yellow aesthetic.

**How to apply:** The canonical palette lives in `artifacts/gabreal-dashboard/src/index.css` using CSS custom properties (`--bg`, `--surface`, `--surface-warm`). Any new UI should use those variables, not hardcoded dark surfaces.
