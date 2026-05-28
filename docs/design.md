# Design language

Locked in M2. The CR-ist's R2 anti-AI checklist consults this file.

## Principles (from the approved plan)

1. **The photos are the design.** UI chrome recedes.
2. **Hebrew typography with character.** Rubik, not the AI-default Heebo / Noto / Assistant.
3. **Editorial restraint.** Text-first buttons, curated icon handful, 8 px max grid gutters, no emoji in headings.

## Color tokens

CSS custom properties live in `src/styles/main.css` under `:root`. The defaults below are M2 ship state; the user may revise the accent.

| Token | Value | Use |
|---|---|---|
| `--bg`             | `#f6f1ea` | Page background (warm paper off-white) |
| `--surface`        | `#ffffff` | Cards, dialogs |
| `--text`           | `#1a1815` | Body text (deep charcoal, not pitch black) |
| `--text-muted`     | `#5a534c` | Secondary text, captions |
| `--accent`         | `#b56439` | Single accent (muted terra-cotta) — user-revisable |
| `--accent-dim`     | `#8c4c2a` | Hover/active for accent |
| `--divider`        | `#e3dccf` | Hairline dividers (1px borders) |
| `--error`          | `#993333` | Error state |

No gradients, no glassmorphism, no multi-color shadows.

## Type scale

Single family: **Rubik** weights 300 / 500 / 700, subsetted to Hebrew + Latin digits.

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `--type-display`   | `2.5rem / 1.1`  | 700 | Big page title (home hero) |
| `--type-h1`        | `1.75rem / 1.2` | 500 | View titles |
| `--type-h2`        | `1.25rem / 1.3` | 500 | Section headers |
| `--type-body`      | `1rem / 1.6`    | 300 | Body |
| `--type-small`     | `0.875rem / 1.5` | 300 | Captions, photo counts |

Numbers use `font-variant-numeric: tabular-nums` so photo counts align.

## Spacing scale

Multiples of 4 px in `rem`:

| Token | rem | px |
|---|---|---|
| `--space-1` | `0.25rem` | 4 |
| `--space-2` | `0.5rem`  | 8 |
| `--space-3` | `1rem`    | 16 |
| `--space-4` | `1.5rem`  | 24 |
| `--space-5` | `2rem`    | 32 |
| `--space-6` | `3rem`    | 48 |
| `--space-7` | `4rem`    | 64 |

## Anti-AI checklist (R2 enforcement)

The CR-ist rejects any screenshot showing:

- Purple/indigo/cyan gradient backgrounds.
- Glassmorphism (`backdrop-filter: blur(...)`).
- "Welcome to {site}!" generic hero text.
- "Built with..." / "Powered by..." badges.
- Emoji decorations in UI labels or headings.
- AI-illustrated decorative banner art.
- Multi-color drop shadows.
- Hebrew copy that reads as machine-translated English (stiff phrasing, literal translations of common UI strings).

Approved typography choices:

- ✅ Rubik (in use)
- ❌ Heebo, Noto Sans Hebrew, Assistant (overused in AI-default Hebrew mockups)
