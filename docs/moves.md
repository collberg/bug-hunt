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

## The two shapes to contrast

- **A symptom that names nothing** (a segfault, an intermittent 500) tends to
  produce a *tangled* graph: a tempting hypothesis, a dead-end detour, a
  backtrack, then the real descent. The expert shortcut is usually **Control
  your variables**, made first.
- **An error that names the gap** (a strict-schema rejection, a "field not
  found") tends to produce a *straight* graph: **Un-hide the error → Localize →
  fix.** Almost no dead ends.

Teaching insight: compare a novice traversal to an expert traversal of the
*same* bug. The expert's graph is shorter because they front-load one or two
moves (usually *Control your variables* and *Read the machine*). That delta is
the lesson.
