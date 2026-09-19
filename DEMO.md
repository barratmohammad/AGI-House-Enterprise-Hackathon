# Swiss — demo runbook

Five minutes, two screens, one live moment. Everything is static files: no build, no server
required, nothing to time out on conference wifi.

## Before you go on

```
open landing/05-signal.html                       # the pitch
open "dashboard/index.html#demo=1"                # the product, armed
```

Open both in tabs first and leave them loaded. Check the dashboard header shows a small
`DEMO 1/5 · Splunk alert fires` chip — that is how you know the live moment is armed. If the
chip is missing, the `#demo=1` got lost; retype it and reload.

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

## 3 · The live incident (about 60 seconds)

**Press Space five times.** One beat per press; you set the pace. Say a line, then press.

| Beat | What lands | Say |
|---|---|---|
| 1 | Splunk alert, bottom right | "A monitoring alert. It's been firing daily for six days. Nobody acknowledged it." |
| 2 | Jira ticket + judge proposal | "Now a ticket: customers say cancelled orders still shipped. The judge thinks these are the same fault — 0.86. It proposes; a person decides." |
| 3 | Accept → thread appears at **#5**, cost 56.25 | "Accepted. It's one story now — ten days live across two tools. One reporter so far, so reach multiplies by one." |
| 4 | Three emails → climbs to **#2**, cost 99 | "Three more people join. Reach goes to 1.75 and it climbs to number two — above the data leak. The incident didn't get worse; we just found out how far it had spread." |
| 5 | Eval case drafts | "And there's the eval case. Input, what it actually said, what it should have said, four pass criteria with a grader each — six of six quotes verified." |

Then land it:

> "That failure was already happening. It was in three tools and nobody had joined it up.
> That's the whole product."

**One number moves and you should name it rather than hope nobody notices:** the headline
drops from 72% to 65%, and the event count goes 42 → 47. Say so —

> "The concentration figure just moved, because the data moved. Still two thirds of the cost
> in three threads out of nine."

## If it misfires

- Nothing happens on Space → the `#demo=1` is gone. Reload the URL with it and carry on.
- Beats out of order, or you want to run it again → **press R**. Resets to the original eight
  threads instantly. Safe to do mid-sentence.
- Total failure → the static dashboard tells the whole story without the live moment. Skip
  to the eval draft on thread 1 and finish there.

## What to say if asked

**"Is the data real?"** No, and we say so on the page. It's a fictional support assistant at a
fictional retailer — but the cost model, the stitching rules and the verification are real, and
you can take any score apart on screen.

**"Isn't the live bit scripted?"** Yes. The incident is scripted; the arithmetic is not. It's
priced by the same weights as the other eight threads, and you can check the formula against
the total in the panel.

**"What's the moat?"** The ledger. Anyone can ask a model to write evals. Knowing *which*
failures are worth an eval needs incident history joined across tools and priced — and once
you have that, the regression labels and re-run triggers fall out of it for free.
