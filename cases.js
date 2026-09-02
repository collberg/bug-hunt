/* ==========================================================================
 * Demo cases for the Bug Hunt player. Fully synthetic — no real codebase.
 * A "case" is a bug hunt as an annotated graph. Fields per case:
 *   name, sub            selector label + subtitle
 *   steps[]              {chapter, kind, move, lane, title, tag?, narr}
 *   code[]               one entry per step for the bottom panel: {lang, cap, body[]}
 *   edges[]              {f, t, type}  type = seq | branch | backtrack | shortcut
 *   audio?               array of clip URLs per step (optional; else browser TTS)
 * kind ∈ evidence | deadend | pivot | win | root | retro   (drives colour)
 * lane: 0 = main spine, 1 = dead-end detour (indented).
 * Code-line builders (from index.html): P plain, C comment, H problem, K fix.
 * See docs/authoring.md.
 * ======================================================================== */
window.APP_TITLE = "Bug Hunt — demo";

/* ---- Case 1: a tangled hunt (branch → dead ends → backtrack → shortcut) ---- */
const RACE_STEPS = [
 {chapter:"The evidence",kind:"evidence",move:"Read the symptom",lane:0,title:"An intermittent 500",
  narr:`An API endpoint returns HTTP 500 — but only sometimes. The logs show the bare status code and nothing else. No stack trace, no pattern anyone can see. That is all we start with.`},
 {chapter:"The tempting hypothesis",kind:"deadend",move:"Form a hypothesis",lane:0,title:"“The morning deploy broke it”",
  narr:`There was a deploy this morning, and the errors started today. So the first hypothesis writes itself: the deploy caused it. It feels obvious — which is exactly when a hypothesis deserves a test rather than a nod.`},
 {chapter:"The tempting hypothesis",kind:"deadend",move:"Bisect (misapplied)",lane:1,title:"Bisect the deploys",
  narr:`I roll back release by release, watching the error rate, and one release looks guilty. Confirmed? Only if the comparison is fair — and I never checked that the two releases were tested under the same conditions.`},
 {chapter:"The trap",kind:"deadend",move:"Control your variables",lane:1,title:"The comparison drifted",
  narr:`Each release was observed under whatever live traffic happened to be flowing at the time. Load, concurrency, and data all differed between runs. The "error rate" I compared was measuring the weather, not the code.`},
 {chapter:"The red herring",kind:"deadend",move:"Spot the red herring",lane:1,title:"A slow query, going nowhere",
  narr:`Along the way I found a slow database query and spent an hour on it. But it is exactly as slow on the healthy release. A thing that behaves identically in the good and the bad version cannot be the cause. Dead end.`},
 {chapter:"The pivot",kind:"pivot",move:"Control your variables",lane:0,title:"Make it reproducible first",tag:"↩ backtrack to here",
  narr:`The way out was inside the dead end: kill the variability. I drive the endpoint with a fixed request, from a controlled harness, on demand — no live traffic. Now a run means something. This is the hinge of the whole hunt.`},
 {chapter:"The pivot",kind:"win",move:"Re-test the assumption",lane:0,title:"The old release fails too",
  narr:`Under the controlled repro I hit the <em>previous</em> release — the one I'd "cleared". It throws the same 500. One observation, and the deploy theory is gone.`},
 {chapter:"The pivot",kind:"win",move:"Falsify your conclusion",lane:0,title:"Falsify your own conclusion",
  narr:`My bisection was wrong; the bug is older than today's deploy. Throwing away that "confirmed" result is the most important move on the timeline. Only now does the real search begin.`},
 {chapter:"Cornering the bug",kind:"win",move:"Narrow the trigger",lane:0,title:"Only under concurrency",
  narr:`I vary one thing at a time. One request at a time: never fails. Several at once: fails often. The trigger is concurrency, not any particular input.`},
 {chapter:"Cornering the bug",kind:"win",move:"Minimize the repro",lane:0,title:"Two requests, every time",
  narr:`I shrink it to the smallest thing that still breaks: two parallel requests to the same endpoint, in a loop. It now fails within seconds, reliably — a mystery turned into an experiment.`},
 {chapter:"Cornering the bug",kind:"win",move:"Read the machine",lane:0,title:"Read the machine, don’t guess",
  narr:`With the repro in hand I attach a debugger and add asserts. The failures land inside a shared in-memory cache: sometimes a missing entry, sometimes a corrupted one. The data structure itself is being torn.`},
 {chapter:"Cornering the bug",kind:"win",move:"Follow the data",lane:0,title:"Follow it to the cache",
  narr:`The cache is a plain hash map, written from every request thread with no lock. Two writers landing together during a resize is exactly what shreds it.`},
 {chapter:"The root cause",kind:"root",move:"Symptom vs cause",lane:0,title:"A data race",
  narr:`The root cause is a data race: unsynchronized writes to a shared, non-thread-safe map. The 500 was just the debris. Resist stopping at the first patchable symptom — fix the race, not the null check that hides it.`},
 {chapter:"The fix",kind:"win",move:"Fix + lock",lane:0,title:"Fix, then lock it down",
  narr:`Swap the map for a thread-safe one (or guard it with a lock). Then a stress test — many parallel requests hammering the endpoint — fails before the fix and passes after, so the race can never quietly return.`},
 {chapter:"If I had known better",kind:"retro",move:"Lesson",lane:0,title:"The one-move version",tag:"the shortcut",
  narr:`If I had known better, I would have built the controlled, on-demand repro first. That one move would have shown the old release failing too — "not the deploy" — and pointed straight at concurrency. The whole red path collapses into it. <strong>Control your variables before you trust a single comparison.</strong>`},
];
const RACE_CODE = [
 {lang:"logs",cap:"all we have",body:[P("GET /api/orders  500   (12 ms)"),P("GET /api/orders  200   (9 ms)"),H("GET /api/orders  500   (11 ms)   <- sometimes"),C("# no stack trace, no pattern")]},
 {lang:"reasoning",cap:"the obvious suspect",body:[C("Deploy went out at 09:14. Errors 'started today'."),C("Prior belief: P(deploy broke it) feels ~0.9"),C("... which is why it needs a test, not a nod.")]},
 {lang:"shell",cap:"bisect the releases",body:[P("$ roll back release, watch error rate ..."),H("release r-241 looks guilty"),C("# but each was watched under different live traffic")]},
 {lang:"note",cap:"the comparison drifted",body:[H("run A: 400 req/s, mostly reads"),H("run B:  30 req/s, a batch job running"),C("error rate compared the weather, not the code")]},
 {lang:"sql",cap:"the slow query — a red herring",body:[P("EXPLAIN SELECT ... ORDER BY created;   -- 800 ms"),H("healthy release: also 800 ms"),C("identical in good & bad  =>  not the cause")]},
 {lang:"shell",cap:"the pivot: a controlled repro",body:[K("$ hey -n 2000 -c 8 http://localhost/api/orders"),C("# fixed input, local, on demand — no live traffic"),K("now a run is reproducible and comparable")]},
 {lang:"shell",cap:"hit the PREVIOUS release the same way",body:[P("$ git checkout r-240 && ./run &"),P("$ hey -n 2000 -c 8 .../api/orders"),H("500s at the same rate  — the 'cleared' release fails too")]},
 {lang:"reasoning",cap:"the hypothesis is dead",body:[C("old release fails too  =>  not the deploy"),K("so: pre-existing bug. Discard the bisection."),C("Start the real search.")]},
 {lang:"shell",cap:"vary one thing: concurrency",body:[P("-c 1   (one at a time)   ->  0 errors"),H("-c 8   (concurrent)      ->  many 500s"),K("trigger = concurrency, not the input")]},
 {lang:"shell",cap:"minimal reproduction",body:[K("curl .../api/orders & curl .../api/orders & wait"),C("# two in parallel, in a loop"),H("fails within seconds, every time")]},
 {lang:"stack",cap:"the tear is inside a shared cache",body:[P("NullPointerException"),H("  at Cache.get(Cache.java:41)"),H("  at OrderService.load(OrderService.java:88)"),C("sometimes null, sometimes a corrupted entry")]},
 {lang:"java",cap:"a plain map, written unlocked",body:[H("private final Map<Id,Order> cache = new HashMap<>();"),P("Order load(Id id) {"),H("   cache.put(id, fetch(id));   // from every request thread"),P("}")]},
 {lang:"the mechanism",cap:"symptom vs cause",body:[C("two put()s during an internal resize"),H("=> torn buckets: lost or corrupted entries"),K("root cause: a data race, not the 500 itself")]},
 {lang:"java · the fix",cap:"a thread-safe map + a stress test",body:[K("private final Map<Id,Order> cache = new ConcurrentHashMap<>();"),P(""),K("@Test void survives_parallel_load() { /* 8 threads */ }"),C("fails before, passes after")]},
 {lang:"the one move",cap:"what I should have done first",body:[K("$ build the controlled repro  (step 1, not step 6)"),K("$ run it against the OLD release  ->  also 500s"),C("=> 'not the deploy', points straight at concurrency"),C("the whole red path collapses to this")]},
];
const RACE_EDGES = [
 {f:0,t:1,type:"seq"},{f:1,t:2,type:"branch"},{f:2,t:3,type:"seq"},{f:3,t:4,type:"seq"},
 {f:4,t:5,type:"backtrack"},{f:5,t:6,type:"seq"},{f:6,t:7,type:"seq"},{f:7,t:8,type:"seq"},
 {f:8,t:9,type:"seq"},{f:9,t:10,type:"seq"},{f:10,t:11,type:"seq"},{f:11,t:12,type:"seq"},
 {f:12,t:13,type:"seq"},{f:1,t:5,type:"shortcut"},
];

/* ---- Case 2: a straight hunt (an error that names the gap) ---- */
const CFG_STEPS = [
 {chapter:"The evidence",kind:"evidence",move:"Read the symptom",lane:0,title:"The app won’t start",
  narr:`The service exits non-zero at boot. Run under a process manager, all you see is that it died and got restarted — no reason given.`},
 {chapter:"See the real error",kind:"win",move:"Un-hide the error",lane:0,title:"Un-hide the message",
  narr:`The first move is to stop hiding the error: run it in the foreground and read stderr. It says exactly what is wrong — <code>config.yaml:12: unknown key "timout"</code>.`},
 {chapter:"See the real error",kind:"win",move:"Localize from the message",lane:0,title:"The message names it",
  narr:`That message is a gift: it names the file, the line, and the offending key. There is nothing to search for — the program has already localized the bug for me.`},
 {chapter:"Look it up",kind:"win",move:"Read the line",lane:0,title:"Line 12 has a typo",
  narr:`Open <code>config.yaml</code> at line 12: <code>timout: 30</code>. A single missing <code>e</code> — it should be <code>timeout</code>.`},
 {chapter:"The root cause",kind:"root",move:"Find the gap",lane:0,title:"Strict schema, unknown key",
  narr:`The loader validates against a schema that only knows <code>timeout</code>, and it runs in strict mode, so an unknown key is a hard error. The typo simply isn't a key it recognizes.`},
 {chapter:"The fix",kind:"win",move:"Fix + lock",lane:0,title:"Fix, and guard it",
  narr:`Correct the spelling. Then add a tiny test that loads the shipped config against the schema, so any future typo fails in CI instead of at 3 a.m.`},
 {chapter:"The contrast",kind:"retro",move:"Lesson",lane:0,title:"When the error names the gap",
  narr:`Contrast this with the intermittent 500. That one named <em>nothing</em> and took a tangled hunt. This one named the file, line, and key in the first real message, and the path was a straight line: un-hide, read, fix. <strong>When the program tells you what is wrong, don't investigate — read it.</strong>`},
];
const CFG_CODE = [
 {lang:"shell",cap:"the symptom, with no detail",body:[P("$ systemctl status app"),H("Active: activating (auto-restart)  (Result: exit-code)"),C("# exit 1, restarted — but no reason shown")]},
 {lang:"shell",cap:"run it in the foreground",body:[P("$ ./app --foreground"),H('FATAL config.yaml:12: unknown key "timout"'),C("# the reason was on stderr all along")]},
 {lang:"the message",cap:"it localizes the bug for you",body:[K("file:  config.yaml"),K("line:  12"),K('key:   "timout"   (not recognized)')]},
 {lang:"yaml · config.yaml",cap:"line 12",body:[P("retries: 3"),H('timout: 30        # <- typo'),P("pool_size: 8")]},
 {lang:"schema",cap:"strict: unknown keys are errors",body:[P("allowed = { retries, timeout, pool_size, ... }"),H('"timout" not in allowed'),C("strict mode -> hard error at load")]},
 {lang:"diff · the fix",cap:"one character, plus a guard",body:[H("- timout: 30"),K("+ timeout: 30"),P(""),K("test: load(shipped_config) validates against schema")]},
 {lang:"two error styles",cap:"why this hunt was short",body:[H("500, no detail            -> names nothing   (the race)"),K('config.yaml:12 bad key    -> names the gap   (this one)'),C("a precise error turns a hunt into a one-line edit")]},
];
const CFG_EDGES = [
 {f:0,t:1,type:"seq"},{f:1,t:2,type:"seq"},{f:2,t:3,type:"seq"},
 {f:3,t:4,type:"seq"},{f:4,t:5,type:"seq"},{f:5,t:6,type:"seq"},
];

window.CASES = {
 race:{name:"The intermittent 500", sub:"A symptom that named nothing — a long, tangled hunt.",
   steps:RACE_STEPS, code:RACE_CODE, edges:RACE_EDGES, audio:/*AUDIO_race_START*/null/*AUDIO_race_END*/},
 config:{name:"The config typo", sub:"An error that named the gap — a near-straight descent.",
   steps:CFG_STEPS, code:CFG_CODE, edges:CFG_EDGES, audio:/*AUDIO_config_START*/null/*AUDIO_config_END*/},
};
