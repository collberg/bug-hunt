# Debugging moves — a small shared vocabulary

The point of a Bug Hunt graph is not the bug; it is the *shape* of the
reasoning. Tag every step with one **move** from the list below, and hunts
become comparable: you can see which moves appear, in what order, and where the
dead ends cluster. Same move ids across cases → the abstraction falls out of the
diff.

These are transferable — they apply to a race condition, a config typo, a
compiler crash, or a failing deploy equally.

| Move | What it is | Why it matters |
|---|---|---|
| **Read the symptom** | State *exactly* what you know, and nothing more. | Stops you from importing assumptions as facts. |
| **Form a hypothesis** | Name a candidate cause — and mark it as a guess. | The tempting first guess deserves a test, not a nod. |
| **Question the premise** | Ask whether the bug is even where you think. | "Is it my change?" is a hypothesis, not a given. |
| **Control your variables** | Remove noise so a comparison means something. | You cannot debug by comparison until the comparison is stable. |
| **Spot the red herring** | Notice a difference present in *both* good and bad. | A thing that behaves identically in both cannot be the cause. |
| **Backtrack deliberately** | Abandon a dead end — and mine it for the move that gets you out. | Dead ends often hand you the tool that solves the problem. |
| **Re-test the assumption** | Re-run the "known good" under the new controlled setup. | The fastest way to kill a wrong hypothesis. |
| **Falsify your conclusion** | Actively try to disprove your own "confirmed" result. | The single highest-value move; ego is the enemy. |
| **Narrow the trigger** | Toggle conditions until the bug appears on command. | Turns "sometimes" into "exactly when". |
| **Minimize the repro** | Shrink to the smallest thing that still breaks. | A mystery becomes a fast experiment. |
| **Read the machine** | Look at the actual state — debugger, trace, disassembly. | One real observation collapses the search space. |
| **Follow the data** | Trace the bad value back toward where it was born. | Symptoms are downstream; causes are upstream. |
| **Symptom vs cause** | Resist fixing the first patchable surface. | The null check that hides a race is not the fix. |
| **Un-hide the error** | Recover the message a wrapper/pipe threw away. | Often the whole hunt was one `2>/dev/null` away. |
| **Localize from the message** | Let a precise error name the file/line/thing. | When the program tells you what's wrong, read it — don't investigate. |
| **Fix + lock** | Fix the mechanism, then add a test that fails-before / passes-after. | Makes the fix a fact, not a hope; stops silent regressions. |
| **Lesson** | The retrospective: the one move you'd start with next time. | This is what the student actually takes away. |
| **Bring a better oracle** | Run a test you did not write — a conformance suite, someone else's corpus. | Your own tests encode the same assumptions as your bug. |
| **Audit the invariant** | State what the code must always keep true, then check the code against that sentence. | The only way to reach a bug whose output is still correct. |
| **Check upstream first** | Before patching vendored/third-party code, look whether upstream already fixed it. | Cheaper than reinventing, and stops you diverging from a fix that exists. |
| **Narrow the fix** | Condition the change on exactly the case that is broken. | A fix that cannot reach the common path cannot regress it. |
| **Strengthen the repro** | Make the test assert the *behaviour*, not just that the thing no longer errors. | "It parses now" would pass even if you mapped it to the wrong meaning. |
| **Fence the scope** | When the hunt turns up a *second* bug, name it and leave it. | A patch that quietly grows is a patch nobody can verify. |
| **Bisect (misapplied)** | Bisecting before the comparison is stable. | The classic trap: it returns a confident, wrong answer. |
| **Trace to the origin** | Walk a value back to the code that first constructs it. | Where it is *born* is where the fix belongs. |
| **Find the gap** | Name the missing case precisely — the type with no home, the keyword with no token. | Turns "it's broken" into a one-line change. |


## Clusters — group hunts by what produced the decisive evidence

One graph illustrates a hunt; the insight is in the **diff between graphs**. The
most useful axis to group them on is not the kind of bug (a race, a typo, a
parser gap) but **what handed you the evidence that cracked it** — because that
is what dictates the shape of the graph, and therefore what the case can teach.

| Cluster | The failure gives you | Typical shape | Decisive move |
|---|---|---|---|
| **Symptom names nothing** | A bare crash, an intermittent error — no information | **Tangled**: tempting hypothesis → dead-end detour → backtrack → real descent | *Control your variables* |
| **The error names the gap** | A file, a line, a missing thing | **Near-straight**: read it, localize, fix | *Un-hide the error*, *Localize from the message* |
| **An outside oracle found it** | Nothing of your own — someone else's test failed | **Straight**, and ends by widening the net that caught it | *Bring a better oracle* |
| **No symptom at all** | Nothing; the program is behaving correctly | **Short**, no dead ends, nothing to react to | *Audit the invariant* |

The first two are opposites and make the sharpest pair to show side by side: a
symptom that names nothing produces dead ends and a backtrack, while an error
that names the gap collapses to an errand. The third is the reminder that most
of your blind spots are only visible through a test you did not write. The
fourth is the one people forget exists — a bug with correct output, reachable
only by naming the invariant it violates.

A player can render these as labelled groups; see `docs/authoring.md`
(`window.CASE_GROUPS`).

## The novice/expert contrast

Teaching insight: compare a novice traversal to an expert traversal of the
*same* bug. The expert's graph is shorter because they front-load one or two
moves (usually *Control your variables* and *Read the machine*). That delta is
the lesson.
