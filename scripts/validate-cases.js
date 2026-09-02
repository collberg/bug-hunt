#!/usr/bin/env node
/*
 * validate-cases.js — sanity-check a cases.js before you ship it.
 *
 *     node scripts/validate-cases.js cases.js [docs/moves.md]
 *
 * Checks the invariants the player assumes but never verifies at runtime
 * (it just renders wrong, or throws, when one is violated):
 *
 *   - code[] is the same length as steps[]        (the bottom panel is indexed by step)
 *   - every edge endpoint is a real step index
 *   - kind / lane / edge type are from the known sets
 *   - every step has a move, and moves are spelled consistently across cases
 *   - CASE_GROUPS reference real cases, and no case is listed twice or left out
 *   - if a moves.md is given, every move used is documented there
 *
 * Exit status 1 if anything is wrong, so it can gate a commit.
 */
const fs = require("fs"), path = require("path");
const file = process.argv[2] || "cases.js";
const movesDoc = process.argv[3];

// the line builders the page defines before cases.js runs
global.P = s => s;
global.C = t => ({c:"cmt", t});
global.H = t => ({c:"hl",  t});
global.K = t => ({c:"ok",  t});
global.window = global;

const src = fs.readFileSync(file, "utf8");
try { (0, eval)(src); }
catch (e) { console.error("FAIL  " + file + " did not evaluate: " + e.message); process.exit(1); }

const CASES  = global.CASES || {};
const GROUPS = global.CASE_GROUPS || [];
const ids    = Object.keys(CASES);
const KINDS  = new Set(["evidence","deadend","pivot","win","root","retro"]);
const ETYPES = new Set(["seq","branch","backtrack","shortcut"]);

let errs = [], warns = [];
const err  = m => errs.push("FAIL  " + m);
const warn = m => warns.push("warn  " + m);

if (!ids.length) err("no cases found (window.CASES is empty)");

const moveUse = new Map();
for (const id of ids) {
  const c = CASES[id], n = (c.steps || []).length;
  if (!n) { err(`${id}: no steps`); continue; }
  if (!c.name) warn(`${id}: no name (the selector will show the id)`);
  if ((c.code || []).length !== n)
    err(`${id}: code[] has ${(c.code||[]).length} entries, steps[] has ${n} — the panel is indexed by step`);
  c.steps.forEach((s, i) => {
    if (!KINDS.has(s.kind)) err(`${id}[${i}]: kind "${s.kind}" not in ${[...KINDS].join("|")}`);
    if (s.lane !== 0 && s.lane !== 1) err(`${id}[${i}]: lane ${s.lane} (expected 0 or 1)`);
    if (!s.move) err(`${id}[${i}]: no move — untagged steps cannot be compared across cases`);
    else moveUse.set(s.move, (moveUse.get(s.move) || 0) + 1);
    if (!s.narr) warn(`${id}[${i}]: empty narr`);
  });
  (c.edges || []).forEach((e, i) => {
    if (!ETYPES.has(e.type)) err(`${id}: edge ${i} type "${e.type}" not in ${[...ETYPES].join("|")}`);
    for (const k of ["f","t"])
      if (!(Number.isInteger(e[k]) && e[k] >= 0 && e[k] < n))
        err(`${id}: edge ${i} ${k}=${e[k]} out of range 0..${n-1}`);
  });
  const reached = new Set([0]);
  (c.edges || []).forEach(e => reached.add(e.t));
  for (let i = 0; i < n; i++)
    if (!reached.has(i)) warn(`${id}[${i}]: no edge arrives here — the node will float`);
}

// groups
if (GROUPS.length) {
  const seen = new Map();
  GROUPS.forEach((g, gi) => {
    if (!g.id)   warn(`group ${gi}: no id`);
    if (!g.name) warn(`group ${gi}: no name`);
    if (!Array.isArray(g.cases)) { err(`group ${g.id||gi}: cases is not an array`); return; }
    g.cases.forEach(cid => {
      if (!CASES[cid]) err(`group ${g.id||gi}: references unknown case "${cid}"`);
      else if (seen.has(cid)) err(`case "${cid}" is in two groups: ${seen.get(cid)} and ${g.id||gi}`);
      else seen.set(cid, g.id || gi);
    });
  });
  const loose = ids.filter(i => !seen.has(i));
  if (loose.length) warn(`ungrouped (will render unlabelled at the end): ${loose.join(", ")}`);
}

// moves vocabulary
if (movesDoc && fs.existsSync(movesDoc)) {
  const doc = fs.readFileSync(movesDoc, "utf8");
  const documented = new Set([...doc.matchAll(/\*\*(.+?)\*\*/g)].map(m => m[1].trim()));
  for (const m of moveUse.keys())
    if (!documented.has(m)) warn(`move "${m}" is used but not documented in ${path.basename(movesDoc)}`);
}

console.log(`${file}: ${ids.length} cases, ${GROUPS.length} groups, ` +
            `${[...moveUse.values()].reduce((a,b)=>a+b,0)} tagged steps, ${moveUse.size} distinct moves`);
warns.forEach(w => console.log(w));
errs.forEach(e => console.log(e));
if (errs.length) { console.log(`\n${errs.length} error(s).`); process.exit(1); }
console.log("OK");
