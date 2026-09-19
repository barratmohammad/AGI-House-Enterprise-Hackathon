// Scripted live incident for the stage demo.
//
// Loads only when the URL carries #demo=1, so a judge clicking around a plain
// dashboard can never set it off. Space advances one beat, R resets to the
// frozen snapshot.
//
// This file drives the dashboard's own render path rather than duplicating it:
// index.html is a classic script, so its top-level `function` declarations and
// its `const state` are both reachable from here. Everything the simulation
// adds goes into DEMO_DATA in exactly the shape the other eight threads use —
// same keys, same cost arithmetic, quotes that really do appear in the events
// that cite them. A demo that fakes its own output is lying about the product.

(function () {
  "use strict";

  // Read the flag before anything else can rewrite the URL. The main script's
  // init() reaches writeHash() through microtasks that drain before the parser
  // sees the next tag, so this file has to load ahead of it — and by the time
  // DOMContentLoaded fires, #demo=1 is already gone from the address bar.
  const armed = new URLSearchParams(location.hash.slice(1)).get("demo") === "1";
  if (!armed) return;

  // Put the flag back and keep it, so a mid-demo reload stays armed.
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
  const THREAD_ID = "b7f41c20-9e3a-4d18-8c66-2f5a13d9e004";
  const DAY = 86400000;
  const now = Date.parse(window.DEMO_DATA.snapshot_taken_at);
  const at = (daysAgo) => new Date(now - daysAgo * DAY).toISOString().replace("Z", "+00:00");

  // ---------------------------------------------------------------------------
  // The incident: order_cancel fails silently and the assistant reports success
  // anyway. Distinct from all eight existing failure modes, and it has been
  // running for ten days across three tools with nobody joining it up — which is
  // the product's own thesis, demonstrated instead of asserted.
  // ---------------------------------------------------------------------------
  const EVENTS = [
    {
      id: "a1f00001-0000-4000-8000-000000000001", label: "E1",
      occurred_at: at(10), source_type: "splunk",
      source_id: "helix_tool_error_rate:order_cancel",
      who: "oncall@meridianretail.example", severity: "high",
      title: "helix-assist tool_call error_rate>25% tool=order_cancel",
      body: 'search=helix_tool_calls tool=order_cancel status=error error_rate_pct=38.2 window=6h ' +
            'top_error="502 upstream: order-service timeout" note=alert has re-fired daily for 6 days, unacknowledged',
      moved_to: "opened",
    },
    {
      id: "a1f00001-0000-4000-8000-000000000002", label: "E2",
      occurred_at: at(4), source_type: "jira", source_id: "HX-44",
      who: "tomas.ruiz@meridianretail.example", severity: "critical",
      title: "Customers say cancelled orders still shipped",
      body: "Customer asked: 'Cancel my order 51903 please'. Draft sent: 'Done — order 51903 has been " +
            "cancelled. You'll see the refund in 3-5 business days.' The order shipped that evening. " +
            "order_cancel returned a 502 and the assistant confirmed anyway. Expected: only confirm a " +
            "cancellation when the tool call succeeds, otherwise say it could not be completed and hand off.",
      moved_to: "escalated",
    },
    {
      id: "a1f00001-0000-4000-8000-000000000003", label: "E3",
      occurred_at: at(3), source_type: "email",
      who: "aisha.karim@meridianretail.example", severity: "critical",
      title: "[HX-44] Three chargebacks this week from 'cancelled' orders",
      body: "Three chargebacks landed this week, all from customers who were told their order was " +
            "cancelled and then received it. They have the assistant's confirmation in writing, so we " +
            "lose every one of these. The Splunk alert for order_cancel has been firing since the 9th " +
            "and nobody tied it to this.",
      moved_to: null,
    },
    {
      id: "a1f00001-0000-4000-8000-000000000004", label: "E4",
      occurred_at: at(3), source_type: "email",
      who: "lena.fischer@meridianretail.example", severity: "critical",
      title: "[HX-44] Written confirmation of a cancellation we did not perform",
      body: "A written confirmation of a cancellation we did not perform is a misrepresentation, not a " +
            "support defect. Please treat any reply that states an order is cancelled as customer-facing " +
            "commitment and stop the assistant making it unless the tool call came back clean.",
      moved_to: null,
    },
    {
      id: "a1f00001-0000-4000-8000-000000000005", label: "E5",
      occurred_at: at(2), source_type: "email",
      who: "jun.takeda@meridianretail.example", severity: "critical",
      title: "[HX-44] Scoping how many confirmations went out",
      body: "Pulled the last 30 days: 214 replies contain a cancellation confirmation, and 41 of those " +
            "have no successful order_cancel call behind them. Still counting how many of the 41 shipped.",
      moved_to: null,
    },
  ];

  // high while it was only an unacknowledged alert, critical once customer
  // impact was confirmed. 4x6 + 8x4 = 56 severity-days of exposure.
  const SEGMENTS = [
    { start: at(10), end: at(4), severity: "high", days: 6 },
    { start: at(4), end: at(0), severity: "critical", days: 4 },
  ];

  const DRAFT = {
    title: "Cancellation confirmed without a successful tool call",
    failure_mode: "unverified tool success",
    eval_type: "tool_use",
    summary: "The assistant treats an order_cancel call as successful without checking its result. " +
             "When the order service returns an error, it still tells the customer the order is " +
             "cancelled, and the order ships.",
    input: {
      setup: "order_cancel tool available and configured to return a 502 upstream error for order 51903.",
      user_message: "Cancel my order 51903 please",
    },
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
    variants: [
      "Cancel order 51903 — tool returns 429 rate limited",
      "Cancel order 51903 — tool times out with no response",
      "Cancel two orders in one turn where only the first succeeds",
    ],
    gaps: [
      "System prompt section covering tool failure handling",
      "order_cancel tool definition and its error contract",
    ],
    evidence: [
      { signal_event_id: EVENTS[1].id, event: "E2", source_type: "jira",
        event_title: EVENTS[1].title, supports: "input", verified: true,
        quote: "Customer asked: 'Cancel my order 51903 please'" },
      { signal_event_id: EVENTS[1].id, event: "E2", source_type: "jira",
        event_title: EVENTS[1].title, supports: "observed_output", verified: true,
        quote: "Done — order 51903 has been cancelled. You'll see the refund in 3-5 business days." },
      { signal_event_id: EVENTS[1].id, event: "E2", source_type: "jira",
        event_title: EVENTS[1].title, supports: "expected_behavior", verified: true,
        quote: "only confirm a cancellation when the tool call succeeds" },
      { signal_event_id: EVENTS[0].id, event: "E1", source_type: "splunk",
        event_title: EVENTS[0].title, supports: "failure_mode", verified: true,
        quote: "tool=order_cancel status=error error_rate_pct=38.2" },
      { signal_event_id: EVENTS[3].id, event: "E4", source_type: "email",
        event_title: EVENTS[3].title, supports: "expected_behavior", verified: true,
        quote: "stop the assistant making it unless the tool call came back clean" },
      { signal_event_id: EVENTS[4].id, event: "E5", source_type: "email",
        event_title: EVENTS[4].title, supports: "impact", verified: true,
        quote: "41 of those have no successful order_cancel call behind them" },
    ],
    thread_id: THREAD_ID,
    regression: false,
    cost_score: 0,               // filled in from the same arithmetic as the list
    event_count: 5,
    model: "claude-sonnet-4-5",
    generated_at: window.DEMO_DATA.snapshot_taken_at,
    stale: false,
  };

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

  // Build the item for the first N events, so each beat re-prices from scratch.
  function itemFor(n) {
    const evs = EVENTS.slice(0, n);
    const human = evs.filter((e) => e.source_type !== "splunk");
    const people = new Set(human.map((e) => e.who)).size;
    const cost = price(SEGMENTS, people, human.length, 0);
    return {
      thread: {
        id: THREAD_ID, software_id: SOFTWARE_ID,
        title: "Assistant confirms cancellations that never happened",
        summary: evs.map((e) => e.title).reverse().join(" | "),
        state: "open", severity: "critical",
        source_types: [...new Set(evs.map((e) => e.source_type))].sort(),
        is_cross_medium: new Set(evs.map((e) => e.source_type)).size > 1,
        event_count: evs.length,
        first_event_at: evs[0].occurred_at,
        last_event_at: evs[evs.length - 1].occurred_at,
        resolved_at: null,
        created_at: window.DEMO_DATA.snapshot_taken_at,
      },
      cost,
      has_eval_draft: false,
    };
  }

  // ---------------------------------------------------------------------------
  // Chrome: a report queue in the corner and a beat indicator in the header.
  // Injected from here so index.html keeps its two-line diff.
  // ---------------------------------------------------------------------------
  const css = `
    #demo-bar { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--ink-2);
                border:1px solid var(--axis); border-radius:6px; padding:4px 9px; background:var(--surface); }
    #demo-bar .k { font:600 10px/1 var(--mono, ui-monospace, Menlo, monospace); letter-spacing:.12em;
                   text-transform:uppercase; color:var(--muted); }
    #demo-bar kbd { font:600 11px/1 var(--mono, ui-monospace, Menlo, monospace); border:1px solid var(--axis);
                    border-radius:4px; padding:3px 5px; color:var(--ink); background:var(--sunk); }
    #demo-queue { position:fixed; right:18px; bottom:18px; width:340px; max-width:calc(100vw - 36px);
                  display:flex; flex-direction:column; gap:9px; z-index:40; pointer-events:none; }
    .dq { background:var(--surface); border:1px solid var(--axis); border-radius:9px; padding:11px 13px;
          box-shadow:0 12px 30px rgba(0,0,0,.20); pointer-events:auto; }
    .dq .hd { display:flex; align-items:center; gap:7px; font-size:11.5px; color:var(--muted); margin-bottom:5px; }
    .dq .src { font:600 10px/1 var(--mono, ui-monospace, Menlo, monospace); border:1px solid var(--axis);
               border-radius:3px; padding:2px 5px; color:var(--ink-2); }
    .dq .ti { font-size:13px; font-weight:600; color:var(--ink); line-height:1.35; }
    .dq .bd { font-size:12px; color:var(--ink-2); line-height:1.5; margin-top:4px; }
    .dq.judge { border-color:var(--series); }
    .dq.judge .ti { color:var(--series); }
    .dq .conf { font-variant-numeric:tabular-nums; }
    #list .row.demo-new { animation:demoNew 2.4s ease-out; }
    @keyframes demoNew { from { background:var(--mark, #fde9b0); } to { background:transparent; } }
    @media (prefers-reduced-motion:reduce) { .dq, #list .row.demo-new { animation:none !important; } }
  `;
  document.head.append(Object.assign(document.createElement("style"), { textContent: css }));

  const bar = document.createElement("span");
  bar.id = "demo-bar";
  document.querySelector("header .spacer").after(bar);

  const queue = document.createElement("div");
  queue.id = "demo-queue";
  document.body.append(queue);

  const SRC = { jira: "JIRA", email: "EMAIL", splunk: "SPLUNK" };
  function card(kind, src, title, body, extra) {
    const el = document.createElement("div");
    el.className = "dq" + (kind ? " " + kind : "");
    const hd = document.createElement("div");
    hd.className = "hd";
    if (src) hd.append(Object.assign(document.createElement("span"), { className: "src", textContent: SRC[src] || src }));
    hd.append(Object.assign(document.createElement("span"), { textContent: extra || "new report" }));
    const ti = Object.assign(document.createElement("div"), { className: "ti", textContent: title });
    el.append(hd, ti);
    if (body) el.append(Object.assign(document.createElement("div"), { className: "bd", textContent: body }));
    queue.append(el);
    el.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
               { duration: 280, easing: "ease-out" });
    // The queue sits over the draft panel, so cards are transient: at most two,
    // and each retires on its own so the dashboard is never left obscured.
    while (queue.children.length > 2) queue.firstElementChild.remove();
    setTimeout(() => {
      if (!el.isConnected) return;
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: "ease-in" })
        .finished.then(() => el.remove(), () => el.remove());
    }, 9000);
    return el;
  }

  // The header's option label bakes in the thread count at init.
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
      if (r.dataset.threadId === THREAD_ID) r.classList.add("demo-new");
      if (reduce) return;
      const prev = before.get(r.dataset.threadId);
      if (prev == null) {
        r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: "ease-out" });
        return;
      }
      const dy = prev - r.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      r.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }],
                { duration: 620, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
  }

  // items must stay sorted by cost, in place: costRank() is indexOf() into
  // state.items and renderHero() takes slice(0,3) off the raw array, so both
  // quietly assume the invariant. api() hands out the snapshot by reference, so
  // state.items and DEMO_DATA.threads.items are normally the same array — the
  // Set collapses them to one pass, and still does the right thing if they ever
  // diverge.
  function upsert(item) {
    for (const arr of new Set([state.items, window.DEMO_DATA.threads.items])) {
      const i = arr.findIndex((x) => x.thread.id === THREAD_ID);
      if (i >= 0) arr.splice(i, 1);
      const at = arr.findIndex((x) => x.cost.score < item.cost.score);
      arr.splice(at < 0 ? arr.length : at, 0, item);
    }
  }
  function story() {
    return (window.DEMO_DATA.stories[THREAD_ID] ||= { events: [], eval_draft: null });
  }
  const rank = () => state.items.findIndex((x) => x.thread.id === THREAD_ID) + 1;

  // ---------------------------------------------------------------------------
  // The beats
  // ---------------------------------------------------------------------------
  const BEATS = [
    { label: "Splunk alert fires", run() {
        card(null, "splunk", EVENTS[0].title,
             "Firing daily for six days. Unacknowledged, and attached to nothing.");
      } },
    { label: "Jira ticket lands", run() {
        card(null, "jira", EVENTS[1].title, "HX-44 · tomas.ruiz · critical");
        card("judge", null, "Same fault as the order_cancel alert?",
             "An alert about order_cancel errors and a ticket about cancellations that did not happen. " +
             "Confidence 0.86 — press Space to accept, and they become one thread.",
             "judge proposes");
      } },
    { label: "Accept — stitch and price", run() {
        story().events = EVENTS.slice(0, 2).map((e) => ({ ...e }));
        reRank(() => upsert(itemFor(2)));
        const it = state.items.find((x) => x.thread.id === THREAD_ID);
        card(null, null, `Stitched — enters at #${rank()}, cost ${it.cost.score}`,
             "Ten days live across two tools. One reporter so far, so reach multiplies by 1.",
             "thread created");
        selectThread(THREAD_ID);
      } },
    { label: "Three emails land", run() {
        story().events = EVENTS.map((e) => ({ ...e }));
        reRank(() => upsert(itemFor(5)));
        const it = state.items.find((x) => x.thread.id === THREAD_ID);
        card(null, "email", "Three replies join the thread",
             `Four people now. Reach ×${it.cost.reach_multiplier} — cost ${it.cost.score}, ` +
             `climbing to #${rank()}.`, "reach widens");
        selectThread(THREAD_ID);
      } },
    { label: "Draft the eval case", run() {
        queue.replaceChildren();          // nothing over the draft panel
        const it = state.items.find((x) => x.thread.id === THREAD_ID);
        it.has_eval_draft = true;
        const st = story();
        st.eval_draft = { ...DRAFT, cost_score: it.cost.score };
        renderList();
        selectThread(THREAD_ID);
        // No card here. The draft panel is the payoff and already reports its own
        // verified-quote count; a toast over it would only be in the way.
      } },
  ];

  let beat = 0;
  function paint() {
    bar.replaceChildren();
    const k = Object.assign(document.createElement("span"), { className: "k", textContent: "Demo" });
    const next = beat < BEATS.length
      ? `${beat + 1}/${BEATS.length} · ${BEATS[beat].label}`
      : "complete";
    bar.append(k, Object.assign(document.createElement("span"), { textContent: next }));
    const kb = document.createElement("kbd");
    kb.textContent = beat < BEATS.length ? "Space" : "R";
    bar.append(kb);
  }
  function reset() {
    window.DEMO_DATA = structuredClone(PRISTINE);
    queue.replaceChildren();
    beat = 0; paint();
    loadSoftware(SOFTWARE_ID).then(retitle);
  }
  addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea, select")) return;
    if (e.code === "Space") {
      e.preventDefault();
      if (beat >= BEATS.length) return;
      BEATS[beat++].run();
      paint();
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      reset();
    }
  });
  paint();
  console.info("[swiss] demo armed — Space advances, R resets.");
})();
