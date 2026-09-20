# Swiss — demo runbook

Five minutes, two screens, one live moment. Everything is static files: no build, no server
required, nothing to time out on conference wifi.

## Before you go on

```
open landing/05-signal.html                       # the pitch
open "dashboard/index.html#demo=1"                # the product, armed
```

Open both in tabs first and leave them loaded. Check the dashboard header shows a
blue-outlined `DEMO 1/5 · Splunk alert fires` chip — that is how you know the live moment is
armed. If the chip is missing, add `#demo=1` to the dashboard URL and reload.

You can also just open the pitch and **click "Open the dashboard"** — those buttons carry the
flag, so the natural click path arms it. Once armed it stays armed for the rest of that browser
session, so a stray reload will not silently disarm you mid-sentence. A judge opening the
dashboard fresh, in their own browser, gets the plain version with no demo chrome.

Projector check: at **1280×720 or wider** the thread panel scrolls inside its own card, which
looks controlled. Below ~1250px wide the whole page scrolls instead. Prefer the wider setting.

---

## 1 · The landing page (about 60 seconds)

> "Every company running an AI application already knows how it fails. The problem is the
> evidence is in Jira, in three email chains, and in an alert nobody connected to either."

Scroll to the staged panel — **Cost is not volume**, the two charts side by side.

> "Same eight incidents, ranked twice. The loudest thing here drew twelve reports and ranks
> seventh by cost. The second most expensive drew three. If you write evals off a ticket
> count, you work the wrong list."

Numbers you can quote, all traceable to `dashboard/data.js`:

| | |
|---|---|
| **72%** | of incident cost sits in 3 of 8 threads |
| **33%** | of the reports are in those same 3 |
| **17.5×** | costliest thread vs. the loudest one |
| **62/62** | cited quotes verified against their source event |

Click **Open the dashboard**. Switch to the armed tab.

## 2 · The dashboard (about 90 seconds)

Walk the ranked list top to bottom, then click the top thread.

> "This one cost the most. Not because it was loud — because it sat at critical severity for
> days, pulled in six people, and then came back after a vendor upgrade. That's the same fix
> paid for twice."

Point at the cost formula: **Exposure × Reach × Recurrence + Effort**.

> "Every score decomposes. Nothing here is a vibe."

Scroll to the eval draft and click one of the evidence quotes — it highlights inside the
event it came from.

> "The model drafted this from the thread. Every quote it cites is checked against the event
> it claims to come from. And the regression label isn't the model's opinion — it's set by the
> thread's own history."

## 3 · The live incident (about 30 seconds)

**Say the bridge line first.** The pitch page and the dashboard deliberately show different
failures — the page pitches what was already found, the demo shows one arriving now. Name that,
or it reads as a mismatch:

> "Everything so far is the backlog — eight failures already stitched and priced, including that
> returns-policy one. Now watch what happens when a new one shows up."

Then press **Run** in the header chip. It plays itself — five beats, about twenty seconds. You
talk over it. **Space** steps manually if you'd rather set the pace; **Reset** draws a fresh one.

**The scenario is drawn at random from three**, so running it twice for two different judges
doesn't look canned. Whichever you get, the shape is identical:

| Beat | What lands | Say |
|---|---|---|
| 1 | A machine alert, bottom right | "A monitoring alert. It's been firing for days. Nobody acknowledged it." |
| 2 | A ticket + the judge's proposal | "Now a ticket from support. The judge thinks these are the same fault. It proposes; a person decides." |
| 3 | Accept → thread appears, priced | "Accepted — it's one story now. Days live across two tools, one reporter, so reach multiplies by one." |
| 4 | Three emails → it climbs | "Three more people join. Reach goes up and it climbs the list. The incident didn't get worse; we just found out how far it had spread." |
| 5 | Eval case drafts | "And there's the eval case. Input, what it actually said, what it should have said, pass criteria with a grader each — six of six quotes verified." |

The three, and where each lands:

| Scenario | Cost | Enters at |
|---|---|---|
| Assistant confirms cancellations that never happened | 99 | #2 |
| Assistant repeats customers' full card numbers back | 113 | #2 |
| Assistant promises restock dates from a stale feed | 78 | #3 |

Then land it:

> "That failure was already happening. It was in three tools and nobody had joined it up.
> That's the whole product."

**One number moves and you should name it rather than hope nobody notices:** the headline
percentage drops when the ninth thread lands, because the data moved. Say so —

> "The concentration figure just moved, because the data moved. Still two thirds of the cost
> in three threads out of nine."

## If it misfires

- No `DEMO` chip in the header → the `#demo=1` is gone. Reload the URL with it and carry on.
- Want to get back to the pitch → the **← Swiss** button, top left of the dashboard.
- Want to run it again → **Reset** (or press R). Back to the original eight threads instantly,
  with a different scenario loaded. Safe to do mid-sentence.
- Total failure → the static dashboard tells the whole story without the live moment. Skip
  to the eval draft on thread 1 and finish there.

## What to say if asked

**"Is the data real?"** No, and we say so on the page. It's a fictional support assistant at a
fictional retailer — but the cost model, the stitching rules and the verification are real, and
you can take any score apart on screen.

**"Why doesn't the landing page show this failure?"** Because it isn't one of the eight. The page
pitches the backlog we'd already stitched and priced; the demo is a ninth incident arriving live.
That's the point of the product, not a gap in it.

**"Isn't the live bit scripted?"** Yes — three scripted scenarios, drawn at random. The incident is scripted; the arithmetic is not. It's
priced by the same weights as the other eight threads, and you can check the formula against
the total in the panel.

**"What's the moat?"** The ledger. Anyone can ask a model to write evals. Knowing *which*
failures are worth an eval needs incident history joined across tools and priced — and once
you have that, the regression labels and re-run triggers fall out of it for free.
