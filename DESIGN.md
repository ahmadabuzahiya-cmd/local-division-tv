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

## TV rules (viewed from across a room)

These follow common 10-foot UI and signage guidance:

- **Type scale** (`--t-*`, in `vw`; the px values are at 1920px wide):

  | Token | Size | Use |
  |---|---|---|
  | `--t-xs` | 1.35vw ≈ 26px | Labels; nothing is smaller |
  | `--t-sm` | 1.6vw ≈ 31px | Secondary text, tags |
  | `--t-md` | 2vw ≈ 38px | Names, rows |
  | `--t-lg` | 2.6vw ≈ 50px | Facts, comparison prices |
  | `--t-xl` | 4.2vw ≈ 80px | The area name |
  | `--t-xxl` | 5.4vw ≈ 104px | The price |

  Sources: tvOS body text ≥ 29pt and secondary ≥ 25pt; signage guidance of about 1 inch of letter height per 10 ft of viewing distance.
- **Safe area:** content stays 5% in from the edges (`--safe-x` 5vw, `--safe-y` 5vh) because some TVs crop the edges (overscan).
- **Readable at a glance:** each slide is understood in 3–5 seconds. That means one big number, a few short facts, and no paragraphs, reference codes or full dates. Lists have at most 4 rows. Say it once: if the tag names the slide, the caption doesn't repeat it.
- **Weights 500 and up** (thin strokes disappear on TVs), light text on dark, and a dark fade behind any text placed over photos.
- **PDF brochure:** a print-friendly white A4 page using the same navy and gold, with gold darkened to `#a8843f` so it stays legible on paper. It's for clients, so it never includes market-check or competitor data. On the details screen it is the one gold (primary) button; "View on Property Finder" is secondary.

## Checklist before shipping a UI change

1. No new hex or `rgba()` outside `TOKENS`. Exceptions are photo fades and the `#000` photo background.
2. Nothing new is outlined just to make it stand out.
3. Check it at phone width (about 390px) and on a 1920×1080 TV.
4. Bump `app.js?v=` in `index.html` so screens pick it up.
