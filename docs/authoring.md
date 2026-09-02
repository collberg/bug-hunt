# Authoring a case

A case study is plain data in `cases.js`. The file sets `window.CASES` (and
optionally `window.APP_TITLE`) and is loaded by `index.html`. The line builders
`P/C/H/K` are defined by the page before `cases.js` runs.

## Shape

```js
window.CASES = {
  myhunt: {
    name: "The intermittent 500",           // selector label
    sub:  "A symptom that named nothing.",   // subtitle
    steps: [ /* one object per step */ ],
    code:  [ /* one entry per step (same length as steps) */ ],
    edges: [ /* wires the graph */ ],
    audio: /*AUDIO_myhunt_START*/null/*AUDIO_myhunt_END*/  // optional; see below
  },
  // ... more cases; the selector buttons appear in this order
};
```

### Clusters (optional)

Set `window.CASE_GROUPS` to render the selector as labelled groups instead of
one flat row. Group hunts by **what produced the decisive evidence** — that is
what dictates the shape of the graph, and so what the case can teach (see
[`moves.md`](moves.md), "Clusters").

```js
window.CASE_GROUPS = [
  {id:"named",                       // stable id (used for the active highlight)
   name:"The error names the gap",   // the little uppercase label
   blurb:"...",                      // tooltip on the label and on the header pill
   cases:["race","config"]},         // case ids, in the order to show them
];
```

A case may appear in **one** group at most. Cases in no group are appended,
unlabelled, at the end. Omit `CASE_GROUPS` entirely and the selector looks
exactly as it did before. The selected case's group name also shows as a pill
next to the page title, with the blurb as its tooltip.

### A step

```js
{
  chapter: "The pivot",          // shown above the title
  kind:    "pivot",              // colour: evidence|deadend|pivot|win|root|retro
  move:    "Control your variables",   // a move from docs/moves.md
  lane:    0,                    // 0 = main spine, 1 = dead-end detour (indented)
  title:   "Make it reproducible first",
  tag:     "↩ backtrack to here",// optional little pill on the card
  narr:    `The way out was ... <code>--flag</code> ... <strong>lesson.</strong>`
}
```

`narr` is HTML (use `<code>`, `<em>`, `<strong>`). Keep it to a few sentences —
it is both the on-screen caption and, stripped of tags, what gets spoken.

### A code entry (bottom panel)

```js
{
  lang: "arm64 · lldb",          // small label
  cap:  "the prologue writes a garbage frame",
  body: [
    P("mov  x16, #-0xe700"),     // P = plain line
    C("// a comment line"),      // C = comment (dim)
    H("sub  sp, sp, x16"),       // H = highlight the PROBLEM (red)
    K("debug_info @ args_stmts")  // K = highlight the FIX / good path (green)
  ]
}
```

Use `null` for a step with no code, or just give an entry with a short `body`.

### Edges

```js
edges: [
  {f:0, t:1, type:"seq"},        // straight connector, same lane
  {f:1, t:2, type:"branch"},     // main -> detour (dashed, veers right)
  {f:4, t:5, type:"backtrack"},  // detour -> main pivot (gold, arrow, labelled)
  {f:1, t:5, type:"shortcut"},   // the expert bypass (dotted; appears at the end)
]
```

`f`/`t` are step indices. A **seq** edge is coloured by its target step's kind,
so the spine changes colour as the hunt moves through its phases. For a straight
hunt, use only `seq` edges between consecutive steps.

## Narration audio (optional)

By default the page speaks `narr` with the browser's TTS — works everywhere, no
setup. To embed nicer, offline neural audio:

1. Put the spoken text (one line per step, cleaned for the ear) in
   `narration/<caseid>.txt`.
2. Install [Piper](https://github.com/rhasspy/piper) in a venv and download a
   voice (see `scripts/render-narration.sh` header).
3. `scripts/render-narration.sh <caseid>` renders each line and base64-embeds it
   into the `/*AUDIO_<caseid>_START*/ … /*_END*/` marker in `cases.js`.

## Ship one file

`scripts/build-standalone.sh cases.js dist/myhunt.html` inlines a `cases.js`
into `index.html`, producing a single self-contained page (audio included) you
can email to a reviewer.

## From a real session log

If you captured a debugging session as JSON-lines (reasoning + tool calls),
`scripts/extract-graph.py session.jsonl > cases.draft.js` emits a **skeleton**:
one step per reasoning/action beat, with `kind`/`lane`/`move`/`edges` left for
you to fill in. It does the transcription; you do the judgement (which beats were
dead ends, what the lesson was).

## Check it before you ship it

```
node scripts/validate-cases.js cases.js docs/moves.md
```

Verifies what the player assumes but never checks at runtime — `code[]` the same
length as `steps[]`, edge endpoints in range, known `kind`/`lane`/edge types,
every step tagged with a move, `CASE_GROUPS` referencing real cases with no
duplicates, and (when given a `moves.md`) that every move used is documented
there. Exits non-zero on error, so it can gate a commit.
