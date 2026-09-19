# Landing page — five directions

The product is **Swiss**: it stitches scattered incident reports into one story per failure,
prices each story, and drafts the eval case for the ones that cost the most.

Five landing pages, one per visual direction. **Signal (05) is the one we're using**, in light. Every page carries the same facts from the same
snapshot in `dashboard/data.js` — 8 threads, 42 events, the cost model and one drafted eval case —
so the only variable between them is the design. Pick one and the others get deleted.

| # | File | Direction | Default mode | Best if |
|---|------|-----------|--------------|---------|
| 01 | [01-ledger.html](01-ledger.html) | **Ledger** — an audit memo. Serif display, warm paper, hairline rules, figures in columns. | light | the room is non-technical |
| 02 | [02-terminal.html](02-terminal.html) | **Terminal** — monospace, dark, hero is a real command with real output. | dark | the judges write evals themselves |
| 03 | [03-international.html](03-international.html) | **International** — visible 12-column grid, very large tight type, exactly one colour. | light | you want it to look expensive |
| 04 | [04-instrument.html](04-instrument.html) | **Instrument** — graticule ground, and a hero that is a reading rather than a slogan. | light | you only get one slide |
| 05 | [05-signal.html](05-signal.html) | **Signal** — one luminous accent, the argument staged as the centrepiece. **← chosen** | light | you are presenting live |

[index.html](index.html) is a chooser that links all five with their PNG renders.

## Running it

Everything is static with no build step and no dependencies. Opening a file directly works:

```
open landing/index.html
```

If you'd rather serve it (recommended when projecting, so the relative links behave identically):

```
python3 -m http.server 8000
# then http://localhost:8000/landing/
```

## Re-rendering the PNGs

Full-page screenshots live in [`../renders/`](../renders/), each rendered at 1440px wide in the
direction's own default mode:

```sh
for spec in 01-ledger:light 02-terminal:dark 03-international:light 04-instrument:light 05-signal:light; do
  n="${spec%%:*}"; s="${spec##*:}"
  npx playwright screenshot --viewport-size="1440,960" --full-page \
    --color-scheme="$s" --wait-for-timeout=900 \
    "file://$PWD/landing/$n.html" "renders/$n.png"
done
```

## Notes on the design

- **Colour is not decorative.** All five use the same validated palette the dashboard already uses —
  a single blue for the cost measure, muted grey for volume, and a four-step single-hue severity
  ramp that passes the ordinal checks (monotone lightness, ≥0.06 adjacent gaps, light end clearing
  the surface) in both light and dark.
- **Cost and volume never share an axis.** Each page ranks the same eight threads twice, in two
  separate charts with their own scales. Collapsing two measures of different scale onto one axis is
  the exact mistake the product exists to correct, so no page commits it.
- **Every number is real.** All figures trace back to `dashboard/data.js`. The one number that
  differs between the thread list and the eval draft is the open thread's cost (45.86 live vs 45.77
  frozen in the draft) — it is still accruing, which is why the pages cite 45.9 and not the draft's
  figure.
