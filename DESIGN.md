# Design system

The rules for the phone and TV views in `app.js`. Read this before changing the look. If a change needs a value that isn't here, add a token rather than a one-off colour.

## Tokens

All tokens live in `TOKENS` at the top of `app.js`, and both views start from it.

**Primitives** are raw values from the BetterHomes palette (marketing toolkit): slate `#1F343F`, denim `#2C537A`, powder blue `#7BA0B2`, sand `#D9B9A0`, mist `#EDE8E4` and bronze `#A97A50`, e.g. `--slate-900` or `--sand-400`. Only the semantic tokens use them. Salmon is for online call-to-action buttons only and isn't used here.

**Semantic tokens** are what components use:

| Role | Token | Use |
|---|---|---|
| Ground | `--bg` | Page background |
| Surfaces | `--surface-1` … `--surface-4` | Cards, then insets, raised items and pressed states. Each step is a little lighter. |
| Text | `--text-1`, `--text-2`, `--text-3` | Primary, secondary, and meta (dates, labels) |
| Hairline | `--line` | Dividers inside a list only, never around a box |
| Accent | `--accent`, `--accent-text`, `--on-accent` | Brand sand: area names, the New badge, the one primary button |
| Tier | `--tier` | Brand denim: the Premium / Featured badge only |
| Status | `--positive`, `--negative` | Price verdicts only (cheapest on the market / above the cheapest) |
| Overlay | `--scrim` | Badges and controls sitting on photos |

**Spacing** uses a 4px scale (`--s-1` 4px … `--s-8` 32px). **Radius:** `--r-sm` 6px for badges and thumbnails, `--r-md` 10px for controls and insets, `--r-lg` 14px for cards, `--r-pill` for chips.

**Type:** Poppins for body and UI (`--font`), and the brand serif for area names and slide headlines (`--serif`: IvyMode, with Georgia standing in where IvyMode isn't installed). The serif is set at weight 400; never use it for prices. The phone scale is 12, 13, 14, 15, 17, 18, 22, 24 and 30px; weights are 400, 500, 600 and 700. Prices use tabular figures.

## Rules

- **One accent.** Sand marks the brand and the single most important thing. Denim is reserved for the paid-tier badge. Never add another accent colour; in particular no purple and no blue "info" boxes.
- **Status colour means status.** Green and coral appear only on the market verdict. Sold prices, savings and counts are plain text.
- **Depth from surfaces, not borders.** A card is `--surface-1` on `--bg`, and an inset inside it is `--surface-2`. No 1px border around boxes, and no coloured left-edge stripes.
- **Say it once.** Sale/rent and property type are one text line (`For rent · Villa`), not coloured badges. On photos only three badges exist: **New** (sand), the paid tier (**Premium** / **Featured**, denim) and **Price reduced** (neutral scrim). A reduced listing also shows its old price struck through next to the price.
- **Real states.** Loading shows skeleton cards in the shape of the real card. An empty result says what didn't match and offers a way back. A failed load keeps what's on screen, or offers **Try again**.
- **No decoration for its own sake:** no gradients, glows, sparkles or emoji. Avatars are real photos; the fallback is initials on `--surface-3`, not a coloured disc.
- **Icons:** one stroke family (2px, round caps), 16–18px.
- **Motion:** short and purposeful (`--ease`, 200–300ms on the phone), and it respects `prefers-reduced-motion`.
- **TV:** sizes in `vw`/`vh` so it scales to any screen; colours come from the same tokens through the aliases `--panel`, `--ink`, `--muted` and `--gold` (which now points at sand). The wordmark carries the tagline "Trust Better. Get Better." beneath it.

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
- **PDF brochure:** a print-friendly white A4 page in brand slate, with bronze `#A97A50` in place of sand so it stays legible on paper. It's for clients, so it never includes market-check or competitor data. On the details screen it is the one gold (primary) button; "View on Property Finder" is secondary.

## Checklist before shipping a UI change

1. No new hex or `rgba()` outside `TOKENS`. Exceptions are photo fades and the `#000` photo background.
2. Nothing new is outlined just to make it stand out.
3. Check it at phone width (about 390px) and on a 1920×1080 TV.
4. Bump `app.js?v=` in `index.html` so screens pick it up.
