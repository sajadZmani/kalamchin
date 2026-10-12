#!/usr/bin/env node
/*
 * Generates data/levels.js and data/dict.js from the JSON made by extract_words.py.
 *
 * Usage: node tools/generate_levels.js <wordlists.json>
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { layout, rng, shuffle } = require('../js/layout.js');

const ROOT = path.join(__dirname, '..');
const src = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

// Short words that make good answers (the 2-letter list from the corpus is noisy).
const TWO = new Set(('آب دو سر سه زن شب کم جا گل پر بد خط ده دل صد پا سگ تن مو نو بز شش گچ نی دم کف چپ مه ' +
  'یخ بو شل کر کج لب زر نم رگ مس پس خر سد بت تب تک تر جو جغ چک خم دد رب رخ رز شک شن ' +
  'شه غم فن کت کو گاز لج مچ مژ نر هو ور یار').split(' ').filter((w) => w.length === 2));

// Rank limits per word length: lower = more common words only.
const RANK = { 2: Infinity, 3: 9000, 4: 11000, 5: 11000, 6: 13000, 7: 15000 };

const rankOf = new Map();
for (const [w, r] of src.targets) {
  if (w.length === 2 && !TWO.has(w)) continue;
  if (r <= RANK[w.length]) rankOf.set(w, r);
}
for (const w of TWO) if (!rankOf.has(w)) rankOf.set(w, 5000);
const targets = [...rankOf.keys()];

// Word lists kept in tools/*.txt (see the comments in those files).
function wordFile(name) {
  return new Set(fs.readFileSync(path.join(__dirname, name), 'utf8').split('\n')
    .filter((l) => !l.startsWith('#')).join(' ').split(/\s+/).filter(Boolean));
}
const BLOCKED = wordFile('blocked_words.txt');   // never accepted anywhere
const NOT_ANSWER = wordFile('not_answers.txt');  // fine as extra words, never on the board
const banned = (w) => BLOCKED.has(w) || NOT_ANSWER.has(w);

const dict = new Set(src.dict);
for (const w of targets) dict.add(w);

function counts(w) {
  const m = {};
  for (const ch of w) m[ch] = (m[ch] || 0) + 1;
  return m;
}
function fits(word, avail) {
  const m = {};
  for (const ch of word) {
    m[ch] = (m[ch] || 0) + 1;
    if (m[ch] > (avail[ch] || 0)) return false;
  }
  return true;
}

// Index targets by length for faster sub-word search.
const byLen = {};
for (const w of targets) (byLen[w.length] = byLen[w.length] || []).push(w);

const TIERS = [
  { count: 15, letters: 3, minLen: 2, minWords: 2, maxWords: 3, baseRank: 2500 },
  { count: 35, letters: 4, minLen: 2, minWords: 3, maxWords: 5, baseRank: 3500 },
  { count: 70, letters: 5, minLen: 3, minWords: 4, maxWords: 6, baseRank: 6000 },
  { count: 90, letters: 6, minLen: 3, minWords: 5, maxWords: 8, baseRank: 9000 },
  { count: 90, letters: 7, minLen: 3, minWords: 6, maxWords: 10, baseRank: 13000 },
];

const usedBases = new Set();
const usedSets = new Set();
const levels = [];
let seed = 7;

// Builds one level around base, or returns null. nextSeed() is only called once a layout is tried.
function tryBase(base, tier, nextSeed, rand, allowed) {
  const avail = counts(base);
  const subs = [];
  for (let n = tier.minLen; n <= tier.letters; n++) {
    for (const w of byLen[n] || []) if (w !== base && allowed(w) && fits(w, avail)) subs.push(w);
  }
  if (subs.length + 1 < tier.minWords) return null;
  subs.sort((a, b) => rankOf.get(a) - rankOf.get(b));
  let chosen = [base, ...subs.slice(0, tier.maxWords - 1)];
  // Too many tiny words make boring boards; keep at most two 2-letter words.
  let twos = 0;
  chosen = chosen.filter((w) => w.length > 2 || ++twos <= 2);
  if (chosen.length < tier.minWords) return null;
  const lay = layout(chosen, { seed: nextSeed(), tries: 80, maxRows: 9, maxCols: 9 });
  if (lay.words.length < tier.minWords) return null;
  // Shuffle the wheel so the base word is not spelled in order.
  let letters;
  do { letters = shuffle([...base], rand); } while (letters.join('') === base && new Set(base).size > 1);
  const common = lay.words.reduce((s, p) => s + Math.log(rankOf.get(p.w)), 0) / lay.words.length;
  return {
    letters: letters.join(''),
    minLen: tier.minLen,
    rows: lay.rows,
    cols: lay.cols,
    words: lay.words.map((p) => [p.w, p.r, p.c, p.d]),
    _sort: lay.words.length * 10 + common,
    _tier: tier,
  };
}

// Builds up to tier.count levels with unused base words, easiest first.
function makeTier(tier) {
  const rand = rng(1000 + tier.letters + (tier.salt || 0));
  const bases = (byLen[tier.letters] || []).filter((w) => rankOf.get(w) <= tier.baseRank);
  const made = [];
  for (const base of bases) {
    if (made.length >= tier.count) break;
    const key = [...base].sort().join('');
    if (usedBases.has(base) || usedSets.has(key)) continue;
    const level = tryBase(base, tier, () => seed++, rand, () => true);
    if (!level) continue;
    usedBases.add(base);
    usedSets.add(key);
    made.push(level);
  }
  made.sort((a, b) => a._sort - b._sort);
  made.forEach((m) => { delete m._sort; });
  console.log(`tier ${tier.letters} letters: ${made.length}/${tier.count}`);
  return made;
}

// Levels 1-300: one tier after another. Never change these tiers, or saved progress points at
// different levels; add new levels after them instead.
for (const tier of TIERS) levels.push(...makeTier(tier));

// Levels 301-1000: every chapter of 10 mixes wheel sizes; each pool gets harder as it is used up.
const MIXED = [
  { count: 70, letters: 5, minLen: 3, minWords: 5, maxWords: 8, baseRank: 11000, salt: 50 },
  { count: 280, letters: 6, minLen: 3, minWords: 6, maxWords: 10, baseRank: 13000, salt: 50 },
  { count: 350, letters: 7, minLen: 3, minWords: 7, maxWords: 12, baseRank: 15000, salt: 50 },
];
const CHAPTER_PATTERN = [6, 7, 5, 6, 7, 6, 7, 6, 7, 7];
const pools = {};
for (const tier of MIXED) pools[tier.letters] = makeTier(tier);
while (Object.values(pools).some((p) => p.length)) {
  for (const n of CHAPTER_PATTERN) {
    const pool = pools[n].length ? pools[n] : Object.values(pools).find((p) => p.length);
    if (pool) levels.push(pool.shift());
  }
}

// Clean pass: a level that uses a word from tools/*.txt is rebuilt in the same slot, from the
// same base word when that word is fine, otherwise from a new one. Other levels stay as they are.
let rebuilt = 0, newBase = 0;
levels.forEach((lv, i) => {
  if (!lv.words.some((e) => banned(e[0]))) return;
  const tier = lv._tier, base = lv.words[0][0];
  const rand = rng(5000 + i);
  let seedN = 90000 + i * 100;
  const nextSeed = () => seedN++;
  const allowed = (w) => !banned(w);
  let fresh = !banned(base) && tryBase(base, tier, nextSeed, rand, allowed);
  if (!fresh) {
    usedBases.delete(base);
    usedSets.delete([...base].sort().join(''));
    for (const b of byLen[tier.letters]) {
      const key = [...b].sort().join('');
      if (rankOf.get(b) > tier.baseRank || banned(b) || usedBases.has(b) || usedSets.has(key)) continue;
      fresh = tryBase(b, tier, nextSeed, rand, allowed);
      if (fresh) { usedBases.add(b); usedSets.add(key); newBase++; break; }
    }
  }
  if (!fresh) throw new Error('could not rebuild level ' + (i + 1));
  delete fresh._sort;
  levels[i] = fresh;
  rebuilt++;
});
console.log('clean pass: rebuilt', rebuilt, 'levels,', newBase, 'with a new base word');
levels.forEach((lv) => { delete lv._tier; });

levels.forEach((lv, i) => { lv.id = i + 1; });

const LEVELS_VERSION = 3; // bump when the built-in levels change
fs.writeFileSync(path.join(ROOT, 'data/levels.js'),
  '// Generated by tools/generate_levels.js. Words: [word, row, col (from the right), "h"|"v"].\n' +
  'window.KALAMCHIN_SEED = {\n  version: ' + LEVELS_VERSION + ',\n  levels: [\n' +
  levels.map((lv) => '    ' + JSON.stringify(lv)).join(',\n') + '\n  ]\n};\n');

const dictWords = [...dict].filter((w) => w.length >= 2 && w.length <= 7 && !BLOCKED.has(w)); // most common first
fs.writeFileSync(path.join(ROOT, 'data/dict.js'),
  '// Generated by tools/generate_levels.js from hazm (MIT) and wordfreq (CC-BY-SA 4.0). Most common first.\n' +
  'window.KALAMCHIN_DICT = "' + dictWords.join(' ') + '";\n');

console.log('levels', levels.length, 'dict', dictWords.length);
