# AGI House Enterprise Hackathon

Project repo for the AGI House Enterprise Hackathon.

## What this is

When a company runs an AI application (a support copilot, say), the things that
go wrong with it get reported all over the place: a Jira ticket here, a few
emails there, a monitoring alert nobody connected to either. Meanwhile the team
that owns the application decides which evals to write mostly from the failures
they can *imagine*.

This project decides from the failures that actually happened. It stitches the
scattered reports into one story per incident, works out what each incident
cost, and turns the costliest ones into draft eval cases.

## How it works

### 1. Reports become threads

Every report about the application is an event: a Jira ticket, an email, a
Splunk alert. A **thread** is all the events that belong to one incident,
whichever tool they came from.

Events are joined automatically only when it is certain they belong together:
they carry the same ticket number, they are replies in the same email chain, or
they are the same alert firing again. When it is only *likely* (an alert and a
ticket that describe the same fault in different words), an AI judge suggests
the match and a person accepts or rejects it. Nothing is merged on a guess.

Each event is also read for what it did to the story: **opened** it, made it
**worse**, **resolved** it, or showed that a resolved problem **came back**.
Replaying those in time order gives the thread's history: how severe it was at
each point, and when it was closed.

### 2. Threads get a cost

Counting tickets tells you how loud a problem was, not what it cost. The cost
of a thread is built from four things the thread already knows:

- **How bad, for how long.** Each day the incident was live counts for more the
  more severe it was: a low-severity day counts 1, medium 2, high 4, critical 8.
  Days spent resolved cost nothing.
- **How many people it pulled in.** Each extra person widens the cost.
- **Whether it came back.** A problem that was fixed and returned means the fix
  was paid for and lost, so the whole cost is scaled up.
- **The effort of handling it.** A small charge for every ticket or email a
  person had to write. Automated alerts don't count as effort.

The dashboard shows this working for every thread, so a score can always be
taken apart.

### 3. Cost sets the priority

Threads are ranked by cost. The **Rank by volume** toggle shows why that
matters. In the demo data, a formatting complaint drew 12 reports and tops the
list by volume, but it was mild and fixed in five days, so it ranks seventh by
cost. A leak of one customer's details into another's case summary drew just 3
reports, but sat at critical severity for nine days. It ranks second. The most
expensive thread of all is one that was fixed and then came back after a vendor
upgrade.

### 4. Costly threads become eval cases

A thread about an AI application is most of an eval case already. It usually
records what the application was asked, what it wrongly answered, and (from
whoever verified the fix) what it should have said.

A language model reads the thread and drafts the case: the input, the observed
and expected output, pass criteria with a way to grade each one, nearby variants
worth testing, and a list of what the author still has to supply, such as the
system prompt. It is told to use only what the thread says, and that is checked
rather than trusted:

- Every quote the draft cites is looked up in the event it claims to come from.
  Click a quote in the dashboard to see it highlighted in the thread.
- The **regression test** label is not the model's opinion. It is set only when
  the thread's own history shows the problem was resolved and came back, and the
  draft then says what kind of change should trigger a re-run.
- Some threads are not about the model's answers at all, such as a run of
  latency alerts. The draft says so instead of inventing a test case.

## Team

- [@barratmohammad](https://github.com/barratmohammad)
