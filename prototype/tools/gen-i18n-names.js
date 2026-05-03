/**
 * gen-i18n-names.js — generate JA→EN name lookup tables for i18n
 *
 * Reads CSV from bearko/mycryptoheroes and emits 3 JSON files under
 * prototype/data/i18n/:
 *   - heroes-en.json:     { "<heroId>": { name, passiveName, passiveText } }
 *   - extensions-en.json: { "<extId>":  { name, series, skillName, skillText } }
 *   - enemies-en.json:    { "<enemyId>": { name } }
 *
 * Usage:
 *   node prototype/tools/gen-i18n-names.js \
 *     <heroes.csv> <extensions.csv> <enemies.csv> <out_dir>
 */

const fs = require("fs");
const path = require("path");

function parseCSV(text) {
  // Minimal CSV parser supporting quoted fields with commas.
  const rows = [];
  let i = 0, field = "", row = [], inQuote = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQuote = false; i++; continue; }
      field += c; i++;
    } else {
      if (c === '"') { inQuote = true; i++; continue; }
      if (c === ",") { row.push(field); field = ""; i++; continue; }
      if (c === "\r") { i++; continue; }
      if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; i++; continue; }
      field += c; i++;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function loadCsvAsObjects(filePath) {
  const text = fs.readFileSync(filePath, "utf-8");
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).filter(r => r.length === headers.length || r.length === headers.length - 1)
    .map(r => Object.fromEntries(headers.map((h, idx) => [h, r[idx] ?? ""])));
}

function emit(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
  console.log("wrote", file, "(", Object.keys(obj).length, "entries )");
}

function main() {
  const [heroesCsv, extsCsv, enemiesCsv, outDir] = process.argv.slice(2);
  if (!heroesCsv || !extsCsv || !enemiesCsv || !outDir) {
    console.error("usage: node gen-i18n-names.js heroes.csv extensions.csv enemies.csv out_dir");
    process.exit(1);
  }

  const heroes = loadCsvAsObjects(heroesCsv);
  const heroesOut = {};
  for (const h of heroes) {
    if (!h.id) continue;
    heroesOut[h.id] = {
      name: h.name_en || "",
      faction: h.faction_en || "",
      passiveName: h.passive_name_en || "",
      passiveText: h.passive_text_en || "",
      attributes: h.attributes_en || "",
    };
  }
  emit(path.join(outDir, "heroes-en.json"), heroesOut);

  const exts = loadCsvAsObjects(extsCsv);
  const extsOut = {};
  for (const e of exts) {
    if (!e.id) continue;
    extsOut[e.id] = {
      name: e.name_en || "",
      series: e.series_en || "",
      skillName: e.active_skill_name_en || "",
      skillText: e.active_skill_text_en || "",
    };
  }
  emit(path.join(outDir, "extensions-en.json"), extsOut);

  const enemies = loadCsvAsObjects(enemiesCsv);
  const enemiesOut = {};
  for (const e of enemies) {
    if (!e.id) continue;
    enemiesOut[e.id] = {
      name: e.name_en || "",
    };
  }
  emit(path.join(outDir, "enemies-en.json"), enemiesOut);
}

main();
