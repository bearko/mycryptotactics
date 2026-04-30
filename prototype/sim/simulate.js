/**
 * Batch simulation CLI.
 *
 * Usage (from anywhere — auto-locates prototype/data):
 *   node sim/simulate.js                          # 300 runs/hero, all 3 heroes
 *   node sim/simulate.js --runs=1000              # custom run count
 *   node sim/simulate.js --hero=kaihime           # single hero
 *   node sim/simulate.js --seed=12345 --runs=1    # deterministic single trace
 *   node sim/simulate.js --report=path/to/report.json
 *
 * Output: aggregate stats + per-chapter death distribution + failure samples.
 *
 * NOTE: This script can be invoked through the same sync.ps1 pattern if
 * Japanese-path issues appear. Currently it uses fs from data dir, so cwd
 * doesn't matter.
 */

const fs = require("fs");
const path = require("path");
const { simulateRun } = require("./run");
const { HEROES, CHAPTERS } = require("./data");

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) args[m[1]] = m[2] ?? true;
  }
  return args;
}

function summarize(results) {
  const total = results.length;
  const wins = results.filter((r) => r.completed).length;
  const winRate = total ? wins / total : 0;
  // Failure distribution per chapter
  const deathByChapter = {};
  for (let i = 1; i <= CHAPTERS.length; i++) deathByChapter[i] = 0;
  const stuckEnemies = {};
  for (const r of results) {
    if (!r.completed) {
      const fc = r.chapterReached;
      deathByChapter[fc] = (deathByChapter[fc] || 0) + 1;
      const f = r.failures[r.failures.length - 1];
      if (f) {
        const key = `ch${fc}/${f.node}/${f.enemy}`;
        stuckEnemies[key] = (stuckEnemies[key] || 0) + 1;
      }
    }
  }
  // Avg nodes cleared
  const avgNodes = results.reduce((a, r) => a + r.nodesCleared, 0) / total;
  // Avg final HP (winners only)
  const winners = results.filter((r) => r.completed);
  const avgFinalHpPct = winners.length
    ? winners.reduce((a, r) => a + r.finalHp / (r.finalHpMax || 1), 0) / winners.length
    : 0;
  return {
    total, wins, winRate,
    deathByChapter,
    stuckEnemies,
    avgNodesCleared: +avgNodes.toFixed(1),
    avgFinalHpPct: +avgFinalHpPct.toFixed(3),
  };
}

function summarizePerChapterAttempts(results) {
  // For each chapter, what % of runs that REACHED it CLEARED it
  const reached = {}, cleared = {};
  for (let i = 1; i <= CHAPTERS.length; i++) { reached[i] = 0; cleared[i] = 0; }
  for (const r of results) {
    const cap = r.completed ? CHAPTERS.length : r.chapterReached;
    for (let i = 1; i <= cap; i++) reached[i]++;
    if (r.completed) for (let i = 1; i <= CHAPTERS.length; i++) cleared[i]++;
    else for (let i = 1; i < r.chapterReached; i++) cleared[i]++;
  }
  const out = {};
  for (let i = 1; i <= CHAPTERS.length; i++) {
    out[i] = {
      reached: reached[i],
      cleared: cleared[i],
      rate: reached[i] ? +(cleared[i] / reached[i]).toFixed(3) : 0,
    };
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const runsPerHero = parseInt(args.runs ?? "300", 10);
  const heroFilter = args.hero || null;
  const seedBase = args.seed ? parseInt(args.seed, 10) : Date.now() & 0xffffffff;
  const verbose = !!args.verbose;
  const reportPath = args.report || null;

  const heroes = HEROES.filter((h) => !heroFilter || h.key === heroFilter);
  console.log(`Simulator config: ${runsPerHero} runs × ${heroes.length} heroes (seed base: ${seedBase})`);

  const allResults = [];
  const start = Date.now();
  for (const hero of heroes) {
    const heroResults = [];
    for (let i = 0; i < runsPerHero; i++) {
      const seed = (seedBase + i * 7919 + hero.heroId * 131) >>> 0;
      const r = simulateRun({ seed, hero, log: verbose ? [] : [] });
      heroResults.push(r);
      allResults.push(r);
    }
    const sum = summarize(heroResults);
    console.log(
      `\n=== ${hero.nameJa} (${hero.key}) ===\n` +
      `  win-rate:    ${(sum.winRate * 100).toFixed(1)}%  (${sum.wins}/${sum.total})\n` +
      `  avg nodes:   ${sum.avgNodesCleared}\n` +
      `  finalHp%:    ${(sum.avgFinalHpPct * 100).toFixed(1)}% (winners avg)\n` +
      `  deaths/ch:   ${JSON.stringify(sum.deathByChapter)}`
    );
    const perCh = summarizePerChapterAttempts(heroResults);
    console.log(`  clear-rate per ch: ${Object.entries(perCh).map(([k,v])=>`${k}=${(v.rate*100).toFixed(0)}%`).join('  ')}`);
    // Top 5 stuck spots
    const top = Object.entries(sum.stuckEnemies).sort((a,b)=>b[1]-a[1]).slice(0,5);
    if (top.length) {
      console.log(`  top death spots:`);
      for (const [k, n] of top) console.log(`    ${k}: ${n}`);
    }
  }

  const grand = summarize(allResults);
  const grandPerCh = summarizePerChapterAttempts(allResults);
  console.log(`\n=== AGGREGATE (${heroes.length} heroes × ${runsPerHero} runs) ===`);
  console.log(`  win-rate: ${(grand.winRate * 100).toFixed(1)}%   avg nodes: ${grand.avgNodesCleared}   finalHp%: ${(grand.avgFinalHpPct*100).toFixed(1)}%`);
  console.log(`  per-chapter clear rate (when reached):`);
  for (const [k, v] of Object.entries(grandPerCh)) {
    console.log(`    ch${k} ${CHAPTERS[k-1].name}: ${(v.rate*100).toFixed(1)}%   (${v.cleared}/${v.reached})`);
  }
  console.log(`  total time: ${((Date.now()-start)/1000).toFixed(1)}s`);

  if (reportPath) {
    const out = {
      meta: { runsPerHero, heroes: heroes.map(h => h.key), seedBase, runtime_ms: Date.now()-start },
      summary: grand,
      perChapter: grandPerCh,
      runs: allResults.map(r => ({
        completed: r.completed,
        chapterReached: r.chapterReached,
        nodesCleared: r.nodesCleared,
        failures: r.failures,
        finalHp: r.finalHp ?? 0,
        finalHpMax: r.finalHpMax ?? 0,
        finalDeckSize: r.finalDeckSize ?? 0,
        seed: r.seed, heroKey: r.heroKey,
      })),
    };
    const abs = path.resolve(reportPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, JSON.stringify(out, null, 2));
    console.log(`  report written: ${abs}`);
  }
}

main();
