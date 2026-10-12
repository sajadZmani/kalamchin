#!/usr/bin/env node
/*
 * Builds data/dict.js (words accepted as extra words) from the JSON made by extract_words.py.
 * Run tools/import_levels.js afterwards: it adds every level word to the dictionary.
 *
 * Usage: node tools/build_dict.js <wordlists.json>
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const BLOCKED = new Set(fs.readFileSync(path.join(__dirname, 'blocked_words.txt'), 'utf8').split('\n')
  .filter((l) => !l.startsWith('#')).join(' ').split(/\s+/).filter(Boolean));

const seen = new Set();
const words = [];
for (const w of [...src.dict, ...src.targets.map((t) => t[0])]) {
  if (w.length < 2 || w.length > 7 || BLOCKED.has(w) || seen.has(w)) continue;
  seen.add(w);
  words.push(w); // most common first
}
fs.writeFileSync(path.join(ROOT, 'data/dict.js'),
  '// Generated from hazm (MIT) and wordfreq (CC-BY-SA 4.0) plus the words in levels.txt. Most common first.\n' +
  'window.KALAMCHIN_DICT = "' + words.join(' ') + '";\n');
console.log('dict', words.length);
