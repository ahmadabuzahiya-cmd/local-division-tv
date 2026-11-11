# Better Homes Local Division: live stock

A live display of the Local Division's listings, taken from Property Finder and refreshed automatically every 10 minutes.

- **TV mode:** a full-screen slideshow for the office screen.
- **Phone mode:** a browsable list for the team, with search, sorting, market checks, recent sales and rentals, and a PDF brochure for every listing.

**Live site:** https://ahmadabuzahiya-cmd.github.io/local-division-tv/

| Open it as | URL |
|---|---|
| Automatic (phone on mobile, TV elsewhere) | `/local-division-tv/` |
| Force TV mode | `/local-division-tv/?view=tv` |
| Force phone mode | `/local-division-tv/?view=phone` |

---

## What it shows

### TV (office screen)

The slideshow moves to a new slide every 15 seconds. Each kind of slide shows only what can be read in a glance from across the room:

- **Listing:** photos, area, title, price, beds, baths and size, and the listing agent. New listings (published in the last 7 days) are tagged **New**.
- **Market check:** after a new listing, its price next to the cheapest similar listing from other agencies.
- **Just sold / Just rented:** every 8 slides, the latest sales or rental contracts in one of the team's main areas, alternating between the two.
- **Agent spotlight:** after every 7 slides, an agent with their live listings and top areas.

The slideshow runs in **rounds**: each round shows every listing once and each Premium or Featured listing twice, spread evenly. A round of about 170 listings takes a little over an hour. New data and the 6-hourly reload continue the round where it left off rather than starting it again, so every listing gets its turn.

It shows the Dubai time, fetches new data every 5 minutes, and reloads itself every 6 hours.

### Phone

- **Listings:** search by area, building or agent. Filters: New, Premium & featured, For sale, For rent, Market check, Price reduced. Sorting: Recommended, Newest, Lowest or highest price, Largest, Above market.
- **Market check:** the three cheapest similar listings from other agencies, shown right on the card. Each opens on Property Finder.
- **Listing details:** the photo gallery, facts and agent, the full market check (our price against up to 8 rivals, each clickable), **Download brochure (PDF)**, and **View on Property Finder**.
- **Just sold** and **Just rented** tabs: recent transactions in the team's top 10 areas. A rental's price is the contract amount, labelled "/ yr" for a 12-month contract or with its real length (for example "2-month"), and marked New or Renewal.

### PDF brochure

A one-page A4 brochure for clients, built in the browser. It has the photos, price, key facts, features, description, the agent's photo and phone number, a QR code to the online listing, and the office footer. It never includes market-check or competitor data.

---

## Setting up a TV

1. Open `https://ahmadabuzahiya-cmd.github.io/local-division-tv/?view=tv` in the TV's browser, or on a small PC or stick connected to it.
2. Click the screen or press **Enter** or **F** to go full screen. The mouse pointer is hidden.
3. For a screen that runs unattended, start the browser in kiosk mode, for example with Chrome or Edge:
   ```
   msedge --kiosk "https://ahmadabuzahiya-cmd.github.io/local-division-tv/?view=tv" --edge-kiosk-type=fullscreen
   ```
   Then set it to launch at startup. The page recovers by itself after network drops and reloads every 6 hours, so it needs no attention.

---

## How it works

```
GitHub Actions, every 10 min ──► node fetch.mjs ──► data.json + details.json ──► commit if changed
                                                                                   │
                                                          GitHub Pages serves the site
                                                                                   │
            TV / phone browser ──► index.html ──► app.js ──► reads data.json every 5 min
                                                       └──► details.json only when a brochure is made
```

There's no server, database or build step. It's a static site, plus a scheduled job that refreshes the data files.

| File | What it does |
|---|---|
| [`index.html`](index.html) | Loads `app.js`. The `?v=` number on the script tag forces screens to pick up a new version. |
| [`app.js`](app.js) | The whole app: design tokens, phone mode, the brochure generator and TV mode. |
| [`fetch.mjs`](fetch.mjs) | Collects the data from Property Finder (details below). Node 20+, no dependencies. |
| [`data.json`](data.json) | Listings, market checks, and recent sales and rentals. **Generated; do not edit by hand.** |
| [`details.json`](details.json) | Descriptions, features, furnishing, plot size and contact details, used only for brochures. **Generated.** |
| [`.github/workflows/update.yml`](.github/workflows/update.yml) | Runs `fetch.mjs` every 10 minutes and commits the data when it changes. GitHub only starts scheduled jobs about once an hour, so each hourly run reads Property Finder 6 times, 10 minutes apart. |
| `price-history.json` | Each listing's last price, used for the Price reduced badge. **Generated.** |
| [`DESIGN.md`](DESIGN.md) | The design system and the rules for the phone, TV and brochure. Read it before changing the look. |

### What `fetch.mjs` collects

1. **Listings:** every sale and rent listing for the broker on Property Finder (`BROKER = 12158`).
2. **Market check:** for listings published in the last 7 days, the 8 cheapest similar listings (same category, property type, area and bedrooms, and within 10% of our size) from other agencies.
3. **Just sold / Just rented:** the latest sale and rental transactions (last 45 days) in the 10 areas where the team has the most listings, for the property type the team lists most in each area. If that type has none, it falls back to all types.
4. **Price reduced:** `price-history.json` keeps each listing's last price. When a price drops, the listing shows **Price reduced** for 14 days, with the old price struck through.
5. **Brochure details:** written to `details.json`, so `data.json`, which screens reload every 5 minutes, stays small.

It writes the files only when something changed, so the history only records real updates.

---

## Working on it

### Run it locally

You need Node 20 or later.

```sh
# refresh the data from Property Finder (about 45 seconds)
node fetch.mjs

# serve the folder with any static server, for example
npx serve .
# then open http://localhost:3000/?view=tv or ?view=phone
```

Opening `index.html` straight from disk won't work, because the browser won't fetch `data.json` over `file://`.

### Making a change

1. Edit `app.js`. All colours, spacing and type sizes come from the tokens at the top; see [`DESIGN.md`](DESIGN.md).
2. **Bump the `?v=` number** in `index.html`, or TVs and phones may keep the cached old version.
3. Check it at phone width (about 390px) and on a 1920×1080 screen.
4. Run `git pull --rebase` before you push. The bot commits data every 10 minutes, so `main` moves often.

Commits use [Conventional Commits](https://www.conventionalcommits.org/) with an emoji, for example `✨ feat(mobile): …`, `🐛 fix(tv): …`, `💄 style(ui): …` or `📝 docs: …`.

### Settings worth knowing

| Where | Setting | Default |
|---|---|---|
| `app.js` | `SLIDE_MS`: time per TV slide | 15 seconds |
| `app.js` | `REFRESH_MIN`: how often screens reload the data | 5 minutes |
| `app.js` | `NEW_DAYS`: how long a listing counts as New | 7 days |
| `app.js` | `SOLD_EVERY` / `BROKER_EVERY`: how often activity and agent slides appear | after every 8 listings / every 7 slides |
| `app.js` | `PAID_PER_ROUND`: how many times each Premium/Featured listing shows per round | 2 |
| `fetch.mjs` | `BROKER`: Property Finder broker id | `12158` |
| `fetch.mjs` | `COMPS`: rivals kept per market check | 8 |
| `update.yml` | `cron`: how often the data refreshes | every 10 minutes |

To refresh the data right away, go to **Actions → Update listings → Run workflow**.

---

## Good to know

- **The data source is unofficial.** It reads Property Finder's public website and the API behind it. There is no official feed or API key. If Property Finder changes their site, the update job will fail, the screens will keep showing the last good data, and the failed run will appear under **Actions**.
- **Market checks are a guide.** "Similar" means the same category, property type, area and bedroom count, within 10% of the size. It doesn't compare condition, view, floor or furnishing.
- **Rental prices are contract amounts.** Short contracts are labelled with their length, so they aren't mistaken for a yearly rent.
- **No permit numbers.** Property Finder's data doesn't include the permit number, so brochures don't show one.
- **Photos load straight from Property Finder's image servers.**

## Troubleshooting

| Problem | Fix |
|---|---|
| A screen shows an old version | Bump `?v=` in `index.html` (if you changed code), then reload the screen. |
| The TV shows "Could not load the listings" | Check the screen's internet connection. The page retries every minute by itself. |
| Listings stopped updating | Open **Actions → Update listings** and look at the latest run's log. Property Finder has probably changed something. |
| "Could not create the brochure" on a phone | The phone couldn't reach the photo server or the PDF library. Try again on a better connection. |
| A push is rejected about workflow permissions | Changing `.github/workflows/` needs a GitHub login with the `workflow` permission: `gh auth refresh -s workflow`. |
