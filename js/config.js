(function (root) {
  'use strict';

  // Chapter themes: every chapter has 10 levels, a name and its own colours.
  var CHAPTERS = [
    ['تهران', '#f2994a', '#3a1c71', '#d76d77'],
    ['اصفهان', '#2d9cdb', '#0f3b57', '#2a7a9b'],
    ['شیراز', '#eb5757', '#4a1942', '#c0436b'],
    ['تبریز', '#27ae60', '#123524', '#3b7d4f'],
    ['یزد', '#e2a64b', '#5c3a1e', '#b07b3e'],
    ['کاشان', '#e86f9c', '#43203f', '#9b4a7a'],
    ['مشهد', '#3fb8af', '#0b3c49', '#26717a'],
    ['کرمان', '#d35400', '#3d1f12', '#8e4426'],
    ['همدان', '#9b59b6', '#2c1a47', '#6c3d8f'],
    ['رشت', '#16a085', '#0e3b2e', '#2a8068'],
    ['کرمانشاه', '#f39c12', '#4a2c0a', '#a8691b'],
    ['اهواز', '#e74c3c', '#3b0d0c', '#93302a'],
    ['قزوین', '#2e86de', '#122a4a', '#2d5f9a'],
    ['زنجان', '#c56cf0', '#33124a', '#7e3fa6'],
    ['اردبیل', '#10ac84', '#0b3229', '#1e7a62'],
    ['ساری', '#ff9f43', '#4a2a0f', '#b06a2b'],
    ['گرگان', '#ee5253', '#3d1214', '#9c3436'],
    ['بوشهر', '#0abde3', '#0a3443', '#18809c'],
    ['بندرعباس', '#ff6b6b', '#46192b', '#a5425a'],
    ['کیش', '#48dbfb', '#0c3a4f', '#2e8fb0'],
    ['قشم', '#feca57', '#4b3610', '#a8832c'],
    ['سنندج', '#5f27cd', '#1d1240', '#4a2d8c'],
    ['خرم‌آباد', '#1dd1a1', '#0d3a30', '#25866c'],
    ['ارومیه', '#ff9ff3', '#4a1b45', '#a2508f'],
    ['بیرجند', '#e1b12c', '#463610', '#9a7a22'],
    ['زاهدان', '#c23616', '#3a120a', '#86301c'],
    ['سمنان', '#0097e6', '#0b2d45', '#1b6a9a'],
    ['ایلام', '#44bd32', '#13361a', '#2f7d2f'],
    ['شهرکرد', '#8c7ae6', '#241d47', '#5b4ea0'],
    ['یاسوج', '#e84118', '#3e140b', '#963223']
  ].map(function (c, i) {
    return { index: i, name: c[0], accent: c[1], bg1: c[2], bg2: c[3] };
  });

  var CUSTOM_CHAPTER = { index: -1, name: 'مراحل من', accent: '#f2994a', bg1: '#2c3e50', bg2: '#4ca1af' };

  var FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

  root.KConfig = {
    START_COINS: 150,
    LEVEL_REWARD: 10,       // first time a level is finished
    CHAPTER_REWARD: 50,     // extra when the last level of a chapter is finished
    HINT_LETTER_COST: 30,   // reveals the next letter of the first unfinished word
    HINT_CELL_COST: 60,     // reveals a cell the player picks
    EXTRA_GOAL: 8,          // extra words needed to fill the meter
    EXTRA_REWARD: 25,       // coins when the meter is full
    LEVELS_PER_CHAPTER: 10,
    CHAPTERS: CHAPTERS,
    CUSTOM_CHAPTER: CUSTOM_CHAPTER,

    chapterOf: function (levelId) {
      if (levelId >= 10001) return CUSTOM_CHAPTER;
      var i = Math.floor((levelId - 1) / 10);
      return CHAPTERS[i % CHAPTERS.length];
    },

    fa: function (n) {
      return String(n).replace(/[0-9]/g, function (d) { return FA_DIGITS[+d]; });
    }
  };
})(this);
