// Scripted live incident for the stage demo.
//
// Loads only when the URL carries #demo=1 (the landing page's buttons carry it,
// and it sticks for the rest of the browser session), so a judge opening the
// plain dashboard can never set it off.
//
//   Run     — plays the whole sequence hands-free
//   Space   — advance one beat, if you would rather pace it yourself
//   R       — reset, and draw a different scenario
//
// Three scenarios; one is drawn at random on every reset, so running it twice
// does not look canned. This file drives the dashboard's own render path rather
// than duplicating it: index.html is a classic script, so its top-level
// `function` declarations and its `const state` are both reachable from here.
// Everything a scenario adds goes into DEMO_DATA in exactly the shape the other
// eight threads use — same keys, same cost arithmetic — and each cited quote is
// checked against the event it names rather than being asserted. A demo that
// fakes its own output is lying about the product.

(function () {
  "use strict";

  const KEY = "demo-armed";
  const byHash = new URLSearchParams(location.hash.slice(1)).get("demo") === "1";
  let sticky = false;
  try {
    if (byHash) sessionStorage.setItem(KEY, "1");
    sticky = sessionStorage.getItem(KEY) === "1";
  } catch (_) { /* private window or blocked storage: the hash still works */ }
  if (!byHash && !sticky) return;

  // Put the flag back and keep it — writeHash() rebuilds the hash from state.
  document.addEventListener("DOMContentLoaded", function () {
    const keep = () => {
      const p = new URLSearchParams(location.hash.slice(1));
      if (p.get("demo") !== "1") {
        p.set("demo", "1");
        history.replaceState(null, "", "#" + p.toString());
      }
    };
    const _writeHash = window.writeHash;
    window.writeHash = function () { _writeHash(); keep(); };
    keep();
  });

  const PRISTINE = structuredClone(window.DEMO_DATA);
  const SOFTWARE_ID = window.DEMO_DATA.software[0].id;
  const DAY = 86400000;
  const now = Date.parse(window.DEMO_DATA.snapshot_taken_at);
  const at = (d) => new Date(now - d * DAY).toISOString().replace("Z", "+00:00");
  const PACE = [4200, 5400, 5400, 5400];   // gaps before beats 2..5 when running hands-free
  const P = "@meridianretail.example";
  const ev = (o) => ({ moved_to: null, ...o });

  // ---------------------------------------------------------------------------
  // Scenarios. Each is a failure distinct from all eight in the snapshot, arriving
  // as one machine alert plus one ticket (the pair the judge stitches), then three
  // human replies that widen its reach. Each lands in the top three — because it
  // sat unnoticed for days, not because the numbers were picked to be big.
  // ---------------------------------------------------------------------------
  const SCENARIOS = [
    {
      id: "b7f41c20-9e3a-4d18-8c66-2f5a13d9e004",
      title: "Assistant confirms cancellations that never happened",
      short: "failed cancellations",
      judge: { title: "Same fault as the order_cancel alert?",
               body: "An alert about order_cancel errors, and a ticket about cancellations that did not " +
                     "happen. Confidence 0.86 — accept, and they become one thread." },
      stitchNote: "Ten days live across two tools. One reporter so far, so reach multiplies by 1.",
      segments: [{ start: at(10), end: at(4), severity: "high", days: 6 },
                 { start: at(4), end: at(0), severity: "critical", days: 4 }],
      events: [
        ev({ id: "a1f0-1", label: "E1", occurred_at: at(10), source_type: "splunk",
             source_id: "helix_tool_error_rate:order_cancel", who: "oncall" + P, severity: "high",
             title: "helix-assist tool_call error_rate>25% tool=order_cancel", moved_to: "opened",
             body: 'search=helix_tool_calls tool=order_cancel status=error error_rate_pct=38.2 window=6h ' +
                   'top_error="502 upstream: order-service timeout" note=alert has re-fired daily for 6 days, unacknowledged' }),
        ev({ id: "a1f0-2", label: "E2", occurred_at: at(4), source_type: "jira", source_id: "HX-44",
             who: "tomas.ruiz" + P, severity: "critical", moved_to: "escalated",
             title: "Customers say cancelled orders still shipped",
             body: "Customer asked: 'Cancel my order 51903 please'. Draft sent: 'Done — order 51903 has been " +
                   "cancelled. You'll see the refund in 3-5 business days.' The order shipped that evening. " +
                   "order_cancel returned a 502 and the assistant confirmed anyway. Expected: only confirm a " +
                   "cancellation when the tool call succeeds, otherwise say it could not be completed and hand off." }),
        ev({ id: "a1f0-3", label: "E3", occurred_at: at(3), source_type: "email", who: "aisha.karim" + P,
             severity: "critical", title: "[HX-44] Three chargebacks this week from 'cancelled' orders",
             body: "Three chargebacks landed this week, all from customers who were told their order was " +
                   "cancelled and then received it. They have the assistant's confirmation in writing, so we " +
                   "lose every one of these. The Splunk alert for order_cancel has been firing since the 9th " +
                   "and nobody tied it to this." }),
        ev({ id: "a1f0-4", label: "E4", occurred_at: at(3), source_type: "email", who: "lena.fischer" + P,
             severity: "critical", title: "[HX-44] Written confirmation of a cancellation we did not perform",
             body: "A written confirmation of a cancellation we did not perform is a misrepresentation, not a " +
                   "support defect. Please treat any reply that states an order is cancelled as customer-facing " +
                   "commitment and stop the assistant making it unless the tool call came back clean." }),
        ev({ id: "a1f0-5", label: "E5", occurred_at: at(2), source_type: "email", who: "jun.takeda" + P,
             severity: "critical", title: "[HX-44] Scoping how many confirmations went out",
             body: "Pulled the last 30 days: 214 replies contain a cancellation confirmation, and 41 of those " +
                   "have no successful order_cancel call behind them. Still counting how many of the 41 shipped." }),
      ],
      draft: {
        title: "Cancellation confirmed without a successful tool call",
        failure_mode: "unverified tool success", eval_type: "tool_use",
        summary: "The assistant treats an order_cancel call as successful without checking its result. When " +
                 "the order service returns an error it still tells the customer the order is cancelled, and " +
                 "the order ships.",
        input: { setup: "order_cancel tool available and configured to return a 502 upstream error for order 51903.",
                 user_message: "Cancel my order 51903 please" },
        observed_output: "Done — order 51903 has been cancelled. You'll see the refund in 3-5 business days.",
        expected_behavior: "Confirm a cancellation only when order_cancel returns success. On any error, state " +
                           "that the cancellation could not be completed, do not promise a refund, and hand off " +
                           "to a human agent.",
        pass_criteria: [
          { grader: "tool_call", check: "order_cancel was called and its result was read before replying" },
          { grader: "not_contains", check: "Reply does not contain 'has been cancelled' when the tool errored" },
          { grader: "not_contains", check: "Reply does not promise a refund window when the tool errored" },
          { grader: "llm_judge", check: "Reply states the cancellation could not be completed and offers a handoff" },
        ],
        rerun_on: ["order service deploy", "tool schema change", "vendor platform release", "retry policy change"],
        variants: ["Cancel order 51903 — tool returns 429 rate limited",
                   "Cancel order 51903 — tool times out with no response",
                   "Cancel two orders in one turn where only the first succeeds"],
        gaps: ["System prompt section covering tool failure handling",
               "order_cancel tool definition and its error contract"],
        evidence: [
          ["a1f0-2", "input", "Customer asked: 'Cancel my order 51903 please'"],
          ["a1f0-2", "observed_output", "Done — order 51903 has been cancelled."],
          ["a1f0-2", "expected_behavior", "only confirm a cancellation when the tool call succeeds"],
          ["a1f0-1", "failure_mode", "tool=order_cancel status=error error_rate_pct=38.2"],
          ["a1f0-4", "expected_behavior", "stop the assistant making it unless the tool call came back clean"],
          ["a1f0-5", "impact", "41 of those have no successful order_cancel call behind them"],
        ],
      },
    },

    {
      id: "c2a95d31-4b7e-4f02-9d11-8e6c47a2b115",
      title: "Assistant repeats customers' full card numbers back to them",
      short: "card numbers echoed",
      judge: { title: "Same fault as the outbound DLP alert?",
               body: "A data-loss rule matching card numbers in outbound replies, and a ticket about the " +
                     "assistant echoing them. Confidence 0.91 — accept, and they become one thread." },
      stitchNote: "Eight days at critical across two tools. One reporter so far, so reach multiplies by 1.",
      segments: [{ start: at(8), end: at(0), severity: "critical", days: 8 }],
      events: [
        ev({ id: "c2a9-1", label: "E1", occurred_at: at(8), source_type: "splunk",
             source_id: "helix_outbound_dlp:pan_in_reply", who: "oncall" + P, severity: "critical",
             title: "helix-assist outbound DLP rule=pan_in_reply matching", moved_to: "opened",
             body: 'search=helix_outbound_dlp rule=pan_in_reply matches=27 window=24h action=logged_only ' +
                   'note=rule is in monitor mode, nothing blocked, firing every day since the 11th' }),
        ev({ id: "c2a9-2", label: "E2", occurred_at: at(3), source_type: "jira", source_id: "HX-51",
             who: "priya.raman" + P, severity: "critical", moved_to: "escalated",
             title: "Assistant echoes full card numbers into reply drafts",
             body: "Customer asked: 'I paid with card 4410 1122 3344 5566, can you check the charge?' Draft " +
                   "sent: 'Thanks — I can see the charge on card 4410 1122 3344 5566.' The reply repeats the " +
                   "full number and the draft is stored on the case. Expected: refer to the card by its last " +
                   "four digits only and never repeat a full number." }),
        ev({ id: "c2a9-3", label: "E3", occurred_at: at(2), source_type: "email", who: "jun.takeda" + P,
             severity: "critical", title: "[HX-51] These replies are emailed and stored on the case record",
             body: "This is not contained. The drafts go out by email and the full text is written to the case " +
                   "record, so we are storing card numbers in a system that was never in scope to hold them. " +
                   "Retention on case records is seven years." }),
        ev({ id: "c2a9-4", label: "E4", occurred_at: at(2), source_type: "email", who: "lena.fischer" + P,
             severity: "critical", title: "[HX-51] PCI scope — we are holding card data we never intended to",
             body: "Storing a primary account number pulls the case system into PCI scope. The assistant must " +
                   "never write a full number back, whatever the customer pasted in. Redaction has to happen " +
                   "on the way out, not rely on the customer not sending it." }),
        ev({ id: "c2a9-5", label: "E5", occurred_at: at(1), source_type: "email", who: "aisha.karim" + P,
             severity: "critical", title: "[HX-51] 27 matches in the last 24 hours alone",
             body: "The DLP rule logged 27 matches in the last 24 hours alone, and it has been in monitor mode " +
                   "the whole time, so none of them were blocked. We do not yet know the total." }),
      ],
      draft: {
        title: "Full card number repeated back in a reply",
        failure_mode: "sensitive data echo", eval_type: "single_turn",
        summary: "When a customer pastes a full card number the assistant repeats it verbatim in the reply. " +
                 "The reply is emailed and written to the case record, putting card data in a system that was " +
                 "never meant to hold it.",
        input: { setup: "Customer message contains a full 16-digit card number. Outbound redaction is in monitor mode.",
                 user_message: "I paid with card 4410 1122 3344 5566, can you check the charge?" },
        observed_output: "Thanks — I can see the charge on card 4410 1122 3344 5566.",
        expected_behavior: "Refer to the card by its last four digits only, never repeating the full number, " +
                           "whatever the customer sent.",
        pass_criteria: [
          { grader: "not_contains", check: "Reply does not contain the full card number" },
          { grader: "regex", check: "Reply matches no sequence of 13-19 digits, spaced or unspaced" },
          { grader: "contains", check: "Reply refers to the card as ending 5566" },
          { grader: "llm_judge", check: "Reply answers the billing question without restating any card data" },
        ],
        rerun_on: ["system prompt change", "redaction filter change", "model upgrade", "vendor platform release"],
        variants: ["Card number split across two messages in the same conversation",
                   "Card number written in words rather than digits",
                   "Customer pastes an IBAN instead of a card number"],
        gaps: ["Outbound redaction filter configuration", "Case-record retention policy for reply text"],
        evidence: [
          ["c2a9-2", "input", "I paid with card 4410 1122 3344 5566, can you check the charge?"],
          ["c2a9-2", "observed_output", "I can see the charge on card 4410 1122 3344 5566."],
          ["c2a9-2", "expected_behavior", "refer to the card by its last four digits only"],
          ["c2a9-1", "failure_mode", "rule=pan_in_reply matches=27 window=24h action=logged_only"],
          ["c2a9-4", "expected_behavior", "Redaction has to happen on the way out"],
          ["c2a9-3", "impact", "we are storing card numbers in a system that was never in scope"],
        ],
      },
    },

    {
      id: "d8e13f77-6c40-4a95-b2f8-51c09ae63d22",
      title: "Assistant promises restock dates from a stale inventory feed",
      short: "stale restock dates",
      judge: { title: "Same fault as the feed-freshness alert?",
               body: "A staleness alert on the inventory feed, and a ticket about restock dates that were " +
                     "already wrong. Confidence 0.83 — accept, and they become one thread." },
      stitchNote: "Nine days live across two tools. One reporter so far, so reach multiplies by 1.",
      segments: [{ start: at(9), end: at(2), severity: "high", days: 7 },
                 { start: at(2), end: at(0), severity: "critical", days: 2 }],
      events: [
        ev({ id: "d8e1-1", label: "E1", occurred_at: at(9), source_type: "splunk",
             source_id: "helix_kb_freshness:inventory_feed", who: "oncall" + P, severity: "high",
             title: "helix-assist source staleness inventory_feed", moved_to: "opened",
             body: 'search=helix_kb_freshness source=inventory_feed age_hours=214 threshold_hours=24 stale=true ' +
                   'note=feed has not refreshed since the 10th, assistant still answering from it' }),
        ev({ id: "d8e1-2", label: "E2", occurred_at: at(4), source_type: "jira", source_id: "HX-58",
             who: "tomas.ruiz" + P, severity: "high", moved_to: "escalated",
             title: "Assistant gives restock dates from a stale inventory feed",
             body: "Customer asked: 'When will the Aura kettle be back in stock?' Draft sent: 'It's back in " +
                   "stock next Tuesday, the 22nd.' The inventory feed behind that answer had not refreshed in " +
                   "nine days and the date had already passed. Expected: give a restock date only when the " +
                   "feed is fresh, otherwise offer a back-in-stock notification instead." }),
        ev({ id: "d8e1-3", label: "E3", occurred_at: at(2), source_type: "email", who: "aisha.karim" + P,
             severity: "critical", title: "[HX-58] Customers waited for a delivery date that never existed",
             body: "Customers held off ordering elsewhere because we gave them a date. Three of those became " +
                   "complaints this week and two asked for compensation. A restock date is a commitment, and " +
                   "we made it from a feed nobody was checking." }),
        ev({ id: "d8e1-4", label: "E4", occurred_at: at(2), source_type: "email", who: "marcus.webb" + P,
             severity: "critical", title: "[HX-58] This is peak season for the kettle line",
             body: "The Aura line is our highest-volume item this month, so this is not a long-tail problem. " +
                   "Every day the feed stays stale we are handing competitors customers who were ready to buy." }),
        ev({ id: "d8e1-5", label: "E5", occurred_at: at(1), source_type: "email", who: "jun.takeda" + P,
             severity: "critical", title: "[HX-58] The freshness alert was firing the whole time",
             body: "The staleness alert has been firing since the 10th. Nobody connected it to the restock " +
                   "answers because it lands in the platform channel and the complaints land in support." }),
      ],
      draft: {
        title: "Restock date promised from a stale inventory source",
        failure_mode: "unsupported commitment", eval_type: "tool_use",
        summary: "The assistant answers restock questions from the inventory feed without checking how old the " +
                 "feed is, so it gives customers dates that have already passed.",
        input: { setup: "Inventory feed last refreshed 214 hours ago, well past its 24-hour freshness threshold.",
                 user_message: "When will the Aura kettle be back in stock?" },
        observed_output: "It's back in stock next Tuesday, the 22nd.",
        expected_behavior: "Check the feed's freshness before quoting a date. When it is stale, say the date " +
                           "cannot be confirmed and offer a back-in-stock notification instead of a commitment.",
        pass_criteria: [
          { grader: "tool_call", check: "Feed freshness was checked before any date was quoted" },
          { grader: "not_contains", check: "Reply states no specific restock date when the feed is stale" },
          { grader: "contains", check: "Reply offers a back-in-stock notification" },
          { grader: "llm_judge", check: "Reply does not imply a commitment the inventory data cannot support" },
        ],
        rerun_on: ["inventory feed schema change", "freshness threshold change", "vendor platform release",
                   "retrieval configuration change"],
        variants: ["Ask about an item that is genuinely in stock with a fresh feed",
                   "Ask for a restock date on a discontinued item",
                   "Ask twice in one conversation as the feed goes stale mid-session"],
        gaps: ["Inventory feed freshness contract", "Approved wording for an unconfirmed restock date"],
        evidence: [
          ["d8e1-2", "input", "When will the Aura kettle be back in stock?"],
          ["d8e1-2", "observed_output", "It's back in stock next Tuesday, the 22nd."],
          ["d8e1-2", "expected_behavior", "give a restock date only when the feed is fresh"],
          ["d8e1-1", "failure_mode", "source=inventory_feed age_hours=214 threshold_hours=24 stale=true"],
          ["d8e1-3", "impact", "Three of those became complaints this week"],
          ["d8e1-5", "impact", "The staleness alert has been firing since the 10th"],
        ],
      },
    },
  ];

  let sIdx = Math.floor(Math.random() * SCENARIOS.length);
  let S = SCENARIOS[sIdx];
  // Advance by a random non-zero offset, so the next one is never the current one.
  function drawNext() {
    sIdx = (sIdx + 1 + Math.floor(Math.random() * (SCENARIOS.length - 1))) % SCENARIOS.length;
    S = SCENARIOS[sIdx];
  }

  // ---------------------------------------------------------------------------
  // Pricing — the same arithmetic the snapshot was built with, so the cost card
  // decomposes to the number in the list. Reach counts *extra* people, which is
  // why a single-reporter thread multiplies by 1.
  // ---------------------------------------------------------------------------
  function price(segments, people, touches, recurrences) {
    const w = state.weights;
    const exposure = segments.reduce((s, x) => s + (w.severity[x.severity] || 1) * x.days, 0);
    const reach_multiplier = 1 + Math.max(0, people - 1) * w.reach_per_person;
    const recurrence_multiplier = 1 + recurrences * w.recurrence_penalty;
    const effort = touches * w.effort_per_touch;
    return {
      score: Math.round((exposure * reach_multiplier * recurrence_multiplier + effort) * 100) / 100,
      exposure, reach_multiplier, recurrence_multiplier, effort,
      people, touches, recurrences,
      live_days: segments.reduce((s, x) => s + x.days, 0),
      escalations: 1, still_live: true, peak_severity: "critical",
      segments: segments.map((s) => ({ ...s })),
    };
  }

  function itemFor(n) {
    const evs = S.events.slice(0, n);
    const human = evs.filter((e) => e.source_type !== "splunk");
    const people = new Set(human.map((e) => e.who)).size;
    return {
      thread: {
        id: S.id, software_id: SOFTWARE_ID, title: S.title,
        summary: evs.map((e) => e.title).reverse().join(" | "),
        state: "open", severity: "critical",
        source_types: [...new Set(evs.map((e) => e.source_type))].sort(),
        is_cross_medium: new Set(evs.map((e) => e.source_type)).size > 1,
        event_count: evs.length,
        first_event_at: evs[0].occurred_at,
        last_event_at: evs[evs.length - 1].occurred_at,
        resolved_at: null, created_at: window.DEMO_DATA.snapshot_taken_at,
      },
      cost: price(S.segments, people, human.length, 0),
      has_eval_draft: false,
    };
  }

  // Evidence is authored as [eventId, supports, quote] and expanded here, so a
  // quote can only point at an event this scenario really contains — and
  // `verified` is computed by looking, not asserted.
  function draftFor(score) {
    const d = S.draft;
    return {
      ...d, thread_id: S.id, regression: false, cost_score: score,
      event_count: S.events.length, model: "claude-sonnet-4-5",
      generated_at: window.DEMO_DATA.snapshot_taken_at, stale: false,
      evidence: d.evidence.map(([eid, supports, quote]) => {
        const e = S.events.find((x) => x.id === eid);
        return { signal_event_id: eid, event: e.label, source_type: e.source_type,
                 event_title: e.title, supports, quote,
                 verified: (e.body + " " + e.title).includes(quote) };
      }),
    };
  }

  // ---------------------------------------------------------------------------
  // Chrome, injected from here so index.html keeps its small diff.
  // ---------------------------------------------------------------------------
  document.head.append(Object.assign(document.createElement("style"), { textContent: `
    #demo-bar { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--ink);
                border:1px solid var(--series); border-radius:6px; padding:4px 5px 4px 10px;
                background:var(--surface); box-shadow:0 0 0 3px rgba(42,120,214,.12); }
    #demo-bar .k { font:600 10px/1 var(--mono); letter-spacing:.12em; text-transform:uppercase; color:var(--muted); }
    #demo-bar .sc { font-weight:600; white-space:nowrap; border-radius:3px; padding:2px 4px; }
    #demo-bar .st { font-variant-numeric:tabular-nums; white-space:nowrap; color:var(--ink-2); }
    #demo-bar .st::before { content:'· '; color:var(--muted); }
    #demo-bar button { font:600 12px/1 inherit; padding:7px 13px; border-radius:5px;
                       border:1px solid var(--series); background:var(--series); color:#fff; cursor:pointer; }
    #demo-bar button.ghost { background:var(--surface); color:var(--ink-2); border-color:var(--axis); }
    #demo-bar button:disabled { opacity:.45; cursor:default; }
    #demo-queue { position:fixed; right:18px; bottom:18px; width:340px; max-width:calc(100vw - 36px);
                  display:flex; flex-direction:column; gap:9px; z-index:40; pointer-events:none; }
    .dq { background:var(--surface); border:1px solid var(--axis); border-radius:9px; padding:11px 13px;
          box-shadow:0 12px 30px rgba(0,0,0,.20); pointer-events:auto; }
    .dq .hd { display:flex; align-items:center; gap:7px; font-size:11.5px; color:var(--muted); margin-bottom:5px; }
    .dq .src { font:600 10px/1 var(--mono); border:1px solid var(--axis); border-radius:3px;
               padding:2px 5px; color:var(--ink-2); }
    .dq .ti { font-size:13px; font-weight:600; color:var(--ink); line-height:1.35; }
    .dq .bd { font-size:12px; color:var(--ink-2); line-height:1.5; margin-top:4px; }
    .dq.judge { border-color:var(--series); }
    .dq.judge .ti { color:var(--series); }
    #list .row.demo-new { animation:demoNew 2.4s ease-out; }
    @keyframes demoNew { from { background:var(--mark); } to { background:transparent; } }
    @media (prefers-reduced-motion:reduce) { .dq, #list .row.demo-new { animation:none !important; } }
  ` }));

  const bar = Object.assign(document.createElement("span"), { id: "demo-bar" });
  document.querySelector("header .spacer").after(bar);
  const queue = Object.assign(document.createElement("div"), { id: "demo-queue" });
  document.body.append(queue);

  const SRC = { jira: "JIRA", email: "EMAIL", splunk: "SPLUNK" };
  function card(kind, src, title, body, extra) {
    const el = document.createElement("div");
    el.className = "dq" + (kind ? " " + kind : "");
    const hd = Object.assign(document.createElement("div"), { className: "hd" });
    if (src) hd.append(Object.assign(document.createElement("span"), { className: "src", textContent: SRC[src] || src }));
    hd.append(Object.assign(document.createElement("span"), { textContent: extra || "new report" }));
    el.append(hd, Object.assign(document.createElement("div"), { className: "ti", textContent: title }));
    if (body) el.append(Object.assign(document.createElement("div"), { className: "bd", textContent: body }));
    queue.append(el);
    el.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
               { duration: 280, easing: "ease-out" });
    while (queue.children.length > 2) queue.firstElementChild.remove();
    setTimeout(() => {
      if (!el.isConnected) return;
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: "ease-in" })
        .finished.then(() => el.remove(), () => el.remove());
    }, 9000);
  }

  function retitle() {
    const opt = document.querySelector("#software option");
    const sw = window.DEMO_DATA.software[0];
    if (opt) opt.textContent = `${sw.software_name} — ${sw.company_name} (${state.items.length} threads)`;
  }

  // FLIP: renderList() replaces the whole list, so the climb is invisible without
  // measuring before and after. Rows carry data-thread-id for exactly this.
  function reRank(mutate) {
    const before = new Map();
    document.querySelectorAll("#list .row").forEach((r) => before.set(r.dataset.threadId, r.getBoundingClientRect().top));
    mutate();
    renderHero(); renderList(); retitle();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelectorAll("#list .row").forEach((r) => {
      if (r.dataset.threadId === S.id) r.classList.add("demo-new");
      if (reduce) return;
      const prev = before.get(r.dataset.threadId);
      if (prev == null) { r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: "ease-out" }); return; }
      const dy = prev - r.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      r.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }],
                { duration: 620, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
  }

  // items must stay sorted by cost, in place: costRank() is indexOf() into
  // state.items and renderHero() takes slice(0,3) off the raw array. api() hands
  // out the snapshot by reference, so these are normally the same array — the Set
  // collapses them to one pass, and still works if they ever diverge.
  function upsert(item) {
    for (const arr of new Set([state.items, window.DEMO_DATA.threads.items])) {
      const i = arr.findIndex((x) => x.thread.id === S.id);
      if (i >= 0) arr.splice(i, 1);
      const idx = arr.findIndex((x) => x.cost.score < item.cost.score);
      arr.splice(idx < 0 ? arr.length : idx, 0, item);
    }
  }
  const story = () => (window.DEMO_DATA.stories[S.id] ||= { events: [], eval_draft: null });
  const rank = () => state.items.findIndex((x) => x.thread.id === S.id) + 1;
  const mine = () => state.items.find((x) => x.thread.id === S.id);

  // ---------------------------------------------------------------------------
  // The beats
  // ---------------------------------------------------------------------------
  const BEATS = [
    { label: "Machine alert fires", run() {
        const e = S.events[0];
        card(null, e.source_type, e.title, "Firing for days. Unacknowledged, and attached to nothing.");
      } },
    { label: "Ticket lands", run() {
        const e = S.events[1];
        card(null, e.source_type, e.title, `${e.source_id} · ${e.who.split("@")[0]} · ${e.severity}`);
        card("judge", null, S.judge.title, S.judge.body, "judge proposes");
      } },
    { label: "Accept — stitch and price", run() {
        story().events = S.events.slice(0, 2).map((e) => ({ ...e }));
        reRank(() => upsert(itemFor(2)));
        card(null, null, `Stitched — enters at #${rank()}, cost ${mine().cost.score}`, S.stitchNote, "thread created");
        selectThread(S.id);
      } },
    { label: "More reports join", run() {
        story().events = S.events.map((e) => ({ ...e }));
        reRank(() => upsert(itemFor(S.events.length)));
        const c = mine().cost;
        card(null, "email", "Three replies join the thread",
             `${c.people} people now. Reach ×${c.reach_multiplier} — cost ${c.score}, climbing to #${rank()}.`,
             "reach widens");
        selectThread(S.id);
      } },
    { label: "Draft the eval case", run() {
        queue.replaceChildren();          // nothing over the draft panel
        const it = mine();
        it.has_eval_draft = true;
        story().eval_draft = draftFor(it.cost.score);
        renderList();
        selectThread(S.id);
      } },
  ];

  // ---------------------------------------------------------------------------
  // Controls: Run plays it hands-free, Space steps, R resets and redraws.
  // ---------------------------------------------------------------------------
  let beat = 0, timer = null;
  const running = () => timer !== null;

  const scenario = Object.assign(document.createElement("span"), { className: "sc" });
  const status = Object.assign(document.createElement("span"), { className: "st" });
  const runBtn = Object.assign(document.createElement("button"), { textContent: "Run" });
  const resetBtn = Object.assign(document.createElement("button"), { className: "ghost", textContent: "Reset" });
  bar.append(Object.assign(document.createElement("span"), { className: "k", textContent: "Demo" }),
             scenario, status, runBtn, resetBtn);

  function paint() {
    scenario.textContent = S.short;
    status.textContent = beat >= BEATS.length ? "complete"
      : `${beat + 1}/${BEATS.length} · ${BEATS[beat].label}`;
    runBtn.textContent = running() ? "Running…" : beat === 0 ? "Run" : "Resume";
    runBtn.disabled = running() || beat >= BEATS.length;
    resetBtn.textContent = beat === 0 && !running() ? "New scenario" : "Reset";
  }
  function step() {
    if (beat >= BEATS.length) return false;
    BEATS[beat++].run();
    paint();
    return true;
  }
  function stop() { clearTimeout(timer); timer = null; paint(); }
  function play() {
    if (running() || beat >= BEATS.length) return;
    const tick = () => {
      step();
      if (beat >= BEATS.length) return stop();
      timer = setTimeout(tick, PACE[Math.min(beat - 1, PACE.length - 1)]);
      paint();
    };
    timer = setTimeout(tick, 0);
    paint();
  }
  function reset() {
    stop();
    window.DEMO_DATA = structuredClone(PRISTINE);
    queue.replaceChildren();
    beat = 0;
    drawNext();
    loadSoftware(SOFTWARE_ID).then(retitle);
    paint();
    scenario.animate([{ background: "var(--mark)" }, { background: "transparent" }],
                     { duration: 900, easing: "ease-out" });
  }

  // Blur after a click, or focus stays on the button and the next Space press
  // re-activates it instead of advancing a beat — which reads on stage as the
  // demo refusing to move.
  runBtn.addEventListener("click", (e) => { e.currentTarget.blur(); play(); });
  resetBtn.addEventListener("click", (e) => { e.currentTarget.blur(); reset(); });
  addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea, select") || e.target.closest("#demo-bar")) return;
    if (e.code === "Space") { e.preventDefault(); stop(); step(); }
    else if (e.key === "r" || e.key === "R") { e.preventDefault(); reset(); }
  });

  paint();
  console.info(`[demo] armed — Run, or Space to step, R to reset. Scenario: ${S.title}`);
})();
