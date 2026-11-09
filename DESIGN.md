# Design system

The rules for the phone and TV views in `app.js`. Read this before changing the look. If a change needs a value that isn't here, add a token rather than a one-off colour.

## Tokens

All tokens live in `TOKENS` at the top of `app.js`, and both views start from it.

**Primitives** are raw values with no meaning, e.g. `--navy-900` or `--gold-500`. Only the semantic tokens use them.

**Semantic tokens** are what components use:

| Role | Token | Use |
|---|---|---|
| Ground | `--bg` | Page background |
| Surfaces | `--surface-1` … `--surface-4` | Cards, then insets, raised items and pressed states. Each step is a little lighter. |
| Text | `--text-1`, `--text-2`, `--text-3` | Primary, secondary, and meta (dates, labels) |
| Hairline | `--line` | Dividers inside a list only, never around a box |
| Accent | `--accent`, `--accent-text`, `--on-accent` | Brand gold: area names, the New badge, the one primary button |
| Status | `--positive`, `--negative` | Price verdicts only (cheapest on the market / above the cheapest) |
| Overlay | `--scrim` | Badges and controls sitting on photos |

**Spacing** uses a 4px scale (`--s-1` 4px … `--s-8` 32px). **Radius:** `--r-sm` 6px for badges and thumbnails, `--r-md` 10px for controls and insets, `--r-lg` 14px for cards, `--r-pill` for chips.

**Type** is the system font stack (`--font`). The phone scale is 12, 13, 14, 15, 17, 18, 22, 24 and 30px; weights are 400, 500, 600 and 700. Prices use tabular figures.

## Rules

- **One accent.** Gold marks the brand and the single most important thing. Never add a second accent colour; in particular no purple and no blue "info" boxes.
- **Status colour means status.** Green and coral appear only on the market verdict. Sold prices, savings and counts are plain text.
- **Depth from surfaces, not borders.** A card is `--surface-1` on `--bg`, and an inset inside it is `--surface-2`. No 1px border around boxes, and no coloured left-edge stripes.
- **Say it once.** Sale/rent and property type are one text line (`For rent · Villa`), not coloured badges. On photos only two badges exist: **New** (gold) and the paid tier (**Premium** / **Featured**, neutral).
- **Real states.** Loading shows skeleton cards in the shape of the real card. An empty result says what didn't match and offers a way back. A failed load keeps what's on screen, or offers **Try again**.
- **No decoration for its own sake:** no gradients, glows, sparkles or emoji. Avatars are real photos; the fallback is initials on `--surface-3`, not a coloured disc.
- **Icons:** one stroke family (2px, round caps), 16–18px.
- **Motion:** short and purposeful (`--ease`, 200–300ms on the phone), and it respects `prefers-reduced-motion`.
- **TV:** sizes in `vw`/`vh` so it scales to any screen; colours come from the same tokens through the aliases `--panel`, `--ink`, `--muted` and `--gold`.

## Checklist before shipping a UI change

1. No new hex or `rgba()` outside `TOKENS`. Exceptions are photo fades and the `#000` photo background.
2. Nothing new is outlined just to make it stand out.
3. Check it at phone width (about 390px) and on a 1920×1080 TV.
4. Bump `app.js?v=` in `index.html` so screens pick it up.
