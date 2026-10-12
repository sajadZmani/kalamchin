#!/usr/bin/env node
/*
 * Builds data/levels/ (files of 100 levels plus index.js) from levels.txt (one level per line: "مرحله‌ی N <TAB> word / word / ...")
 * and makes sure every level word is accepted in data/dict.js.
 *
 * Usage: node tools/import_levels.js [levels.txt]
 *
 * - Separators: / ، , . : – and spaces. Stray marks (» ” * vowel signs) are removed.
 * - آ and ا count as the same letter; the board shows the آ spelling when the dictionary knows it.
 * - FIXES below corrects typos and words that were typed together, per level.
 * - Words in tools/blocked_words.txt are dropped (some players are kids).
 * - The wheel holds every letter the level's words need. Words that do not fit on the board
 *   still count as extra words.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { layout, rng, shuffle } = require('../js/layout.js');

const ROOT = path.join(__dirname, '..');
const SRC = process.argv[2] || path.join(ROOT, 'levels.txt');
const CHUNK = 100; // levels per file in data/levels/

// level number -> {wrong word: 'replacement words' ('' drops it)}
const FIXES = {
  65: { بازرش: 'بازرس' },
  77: { انجیز: 'انجیر' },
  111: { نرگش: 'نرگس' },
  116: { خرمگش: 'خرمگس' },
  179: { ذفن: 'دفن' },
  194: { کلانتز: 'کلانتر' },
  221: { فردوشی: 'فردوسی' },
  253: { خاربشت: 'خارپشت', برخاش: 'پرخاش' },
  257: { بیروز: 'پیروز', برز: 'پرز', شیبور: 'شیپور', زیب: 'زیپ', بوزش: 'پوزش', برویز: 'پرویز', بیش: 'پیش' },
  345: { زتری: '', رتزی: '' },
  379: { نیلو: '' },
  386: { ناورا: '' },
  394: { یلدار: '', دبلر: '' },
  396: { کرمابه: 'گرمابه' },
  398: { کنابه: 'کنایه' },
  482: { یزر: '' },
  497: { کلیومتر: 'کیلومتر' },
  940: { جنجره: '' },
  986: { تتبل: '' },
  989: { حاور: 'خاور' },
  1063: { کتاتی: '' },
  1088: { فربان: 'قربان' },
  1090: { سهید: '' },
  1145: { موادوارد: 'مواد وارد' },
  1148: { امیدمدیر: 'امید مدیر' },
  1155: { رابل: 'زابل' },
  1180: { کلاع: 'کلاغ' },
  1189: { گوهرشاهرگ: 'گوهر شاهرگ' },
  1193: { مدالجعد: 'مدال جعد' },
  1213: { سرودروسیه: 'سرود روسیه' },
  1222: { کشکش: '' },
  1262: { سوادوارد: 'سواد وارد' },
  1270: { دزیا: 'دریا' },
  1354: { سنتورسوهان: 'سنتور سوهان' },
  1420: { قایباف: '' },
  1433: { اوارپری: 'آوار پری', پیرپارو: 'پیر پارو' },
  1477: { بلرفیکس: '' },
  1556: { ستولن: '' },
  1562: { رتیزن: '' },
  1576: { ترگس: 'نرگس' },
  1578: { نبزار: 'نیزار' },
  1609: { کبودکتری: 'کبود کتری' },
  1632: { سبمان: 'سیمان' },
  1633: { هویح: 'هویج' },
  1667: { جاپ: 'چاپ' },
  1695: { رقبت: '' },
  1711: { لبست: 'لیست' },
  1718: { لتیان: '' },
  1740: { ردبف: 'ردیف' },
  1788: { پبشرو: 'پیشرو' },
  1805: { آمان: 'امان' },
  1837: { پبیانو: 'پیانو' },
  1948: { تنبس: 'تنیس' },
  1989: { رقبت: '' },
  2125: { کنجدکمان: 'کنجد کمان' },
  2153: { کورسی: '' },
  2157: { گرماگران: 'گرما گران' },
  2286: { زادستور: '' },
  2347: { سبم: 'سیم' },
  2403: { هندعدل: 'هند عدل' },
  2475: { سابز: '' },
  2481: { ببم: '' },
  2484: { دیدتیغ: 'دید تیغ' },
  2507: { قیرجیر: 'قیر جیر' },
  2542: { خبرخاک: 'خبر خاک' },
  2713: { نخاغ: '' },
  2765: { بهاررکاب: 'بهار رکاب' },
  2769: { خامشظوش: '' },
  2906: { قحتی: '' },
  2907: { تنبر: '' },
  2966: { فبلم: 'فیلم' },
  2971: { کندرنمره: 'کندر نمره' },
  2974: { دمکنی: '' },
  2983: { چدا: 'جدا' },
  2984: { کدبار: '' },
  3029: { آشناخاک: 'آشنا خاک' },
  3036: { خطرخرما: 'خطر خرما', فطرخوف: 'فطر خوف', خاوراخمو: 'خاور اخمو', خارطومم: '' },
  3050: { حمره: 'خمره' },
  3064: { چگه: '' },
  3081: { سیببری: '', ضزب: 'ضرب' },
};

const LETTERS = /^[آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیئ]+$/;
const norm = (w) => w.replace(/آ/g, 'ا');

function wordFile(name) {
  return new Set(fs.readFileSync(path.join(__dirname, name), 'utf8').split('\n')
    .filter((l) => !l.startsWith('#')).join(' ').split(/\s+/).filter(Boolean));
}
const BLOCKED = wordFile('blocked_words.txt');

function loadDict() {
  const window = {};
  eval(fs.readFileSync(path.join(ROOT, 'data/dict.js'), 'utf8')); // sets window.KALAMCHIN_DICT
  return window.KALAMCHIN_DICT.split(' ');
}
const dictList = loadDict();
const dict = new Set(dictList);

// Prefer the spelling with آ when the file left the hat off (اسیب -> آسیب).
function display(w) {
  if (w[0] === 'ا' && !dict.has(w) && dict.has('آ' + w.slice(1))) return 'آ' + w.slice(1);
  return w;
}

const dropped = [];
function parse(file) {
  const out = new Map();
  for (const line of fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n')) {
    const m = /^\s*مرحله[‌ ]?ی\s*(\d+)\s*(.*)$/.exec(line);
    if (!m || /^تا\s*\d+/.test(m[2].trim())) continue; // "مرحله‌ی 201 تا 400" page headers
    const n = +m[1];
    if (out.has(n)) continue;
    const text = m[2].replace(/[ً-ْ»«”“"*]/g, '').replace(/[أإ]/g, 'ا')
      .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ۀ/g, 'ه');
    const fix = FIXES[n] || {};
    const words = [];
    for (let w of text.split(/[/،,.:–\-\s‌]+/)) {
      if (!w) continue;
      for (const v of (w in fix ? fix[w] : w).split(' ')) {
        if (BLOCKED.has(v) || BLOCKED.has(display(v))) { dropped.push(n + ':' + v); continue; }
        if (v.length < 2 || !LETTERS.test(v)) continue;
        const d = display(v);
        if (!words.some((x) => norm(x) === norm(d))) words.push(d);
      }
    }
    out.set(n, words);
  }
  return out;
}

const parsed = parse(SRC);
const total = Math.max(...parsed.keys());
const levels = [];
let skippedWords = 0, levelsWithSkips = 0;

for (let n = 1; n <= total; n++) {
  const words = parsed.get(n);
  if (!words || words.length < 2) throw new Error('level ' + n + ' has fewer than 2 words');
  // Wheel: every letter the words need, as many times as the most demanding word needs it.
  const need = {};
  for (const w of words) {
    const m = {};
    for (const ch of norm(w)) m[ch] = (m[ch] || 0) + 1;
    for (const ch in m) need[ch] = Math.max(need[ch] || 0, m[ch]);
  }
  const wheel = [];
  for (const ch in need) for (let i = 0; i < need[ch]; i++) wheel.push(ch);
  // Longest words first; bigger levels get a bigger board.
  const ordered = words.slice().sort((a, b) => b.length - a.length);
  const big = words.length > 14 ? 12 : words.length > 9 ? 10 : 9;
  let lay = layout(ordered.map(norm), { seed: n * 7 + 3, tries: words.length > 14 ? 150 : 80, maxRows: big, maxCols: big });
  if (lay.skipped.length) {
    // Very big levels: try a larger board, and keep it only if more words fit.
    const larger = layout(ordered.map(norm), { seed: n * 7 + 5, tries: 200, maxRows: 14, maxCols: 14 });
    if (larger.skipped.length < lay.skipped.length) lay = larger;
  }
  const byNorm = {};
  for (const w of words) byNorm[norm(w)] = w;
  if (lay.skipped.length) { skippedWords += lay.skipped.length; levelsWithSkips++; }
  const rand = rng(n);
  let letters;
  do { letters = shuffle(wheel.slice(), rand).join(''); } while (words.some((w) => norm(w) === letters) && new Set(wheel).size > 1);
  const minLen = Math.min(...words.map((w) => w.length));
  levels.push({
    id: n,
    letters,
    minLen: Math.max(2, Math.min(3, minLen)),
    rows: lay.rows,
    cols: lay.cols,
    words: lay.words.map((p) => [byNorm[p.w], p.r, p.c, p.d]),
  });
  for (const w of words) if (!dict.has(w)) { dict.add(w); dictList.push(w); }
}

// Levels go out in files of CHUNK, so players only download the part they have reached.
// index.js (loaded on every visit) lists a fingerprint per file: a browser downloads a file
// again only when its fingerprint changes.
const dir = path.join(ROOT, 'data/levels');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const prints = [];
for (let c = 0; c * CHUNK < levels.length; c++) {
  const part = levels.slice(c * CHUNK, (c + 1) * CHUNK);
  const body = '[\n' + part.map((lv) => '  ' + JSON.stringify(lv)).join(',\n') + '\n]';
  prints.push(crypto.createHash('sha1').update(body).digest('hex').slice(0, 10));
  fs.writeFileSync(path.join(dir, String(c + 1).padStart(3, '0') + '.js'),
    '// Generated by tools/import_levels.js from levels.txt: levels ' + (c * CHUNK + 1) + '-' + (c * CHUNK + part.length) +
    '. Words: [word, row, col (from the right), "h"|"v"].\n' +
    'KALAMCHIN_CHUNK(' + c + ', ' + body + ');\n');
}
fs.writeFileSync(path.join(dir, 'index.js'),
  '// Generated by tools/import_levels.js. One fingerprint per file of ' + CHUNK + ' levels.\n' +
  'window.KALAMCHIN_LEVELS = ' + JSON.stringify({ total: levels.length, size: CHUNK, chunks: prints }) + ';\n');

fs.writeFileSync(path.join(ROOT, 'data/dict.js'),
  '// Generated from hazm (MIT) and wordfreq (CC-BY-SA 4.0) plus the words in levels.txt. Most common first.\n' +
  'window.KALAMCHIN_DICT = "' + dictList.filter((w) => !BLOCKED.has(w)).join(' ') + '";\n');

console.log('blocked words dropped:', dropped.join(' ') || 'none');
console.log('levels', levels.length, '| words that did not fit on the board (still count as extras):',
  skippedWords, 'in', levelsWithSkips, 'levels');
