/*
 * Everything the game keeps lives in localStorage:
 *   kalamchin.levels    {version, levels: [...built-in], custom: [...made by the player]}
 *   kalamchin.state     coins, current level, finished levels, extra-word meter
 *   kalamchin.progress  unfinished levels: {levelId: {found words, hinted cells, extras}}
 */
(function (root) {
  'use strict';

  var PREFIX = 'kalamchin.';
  var memory = {}; // fallback when localStorage is blocked (private mode etc.)

  function read(key, fallback) {
    var raw = null;
    try { raw = root.localStorage.getItem(PREFIX + key); } catch (e) { raw = memory[key] || null; }
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  var cache = null; // parsed kalamchin.levels

  function write(key, value) {
    if (key === 'levels') cache = value;
    var raw = JSON.stringify(value);
    memory[key] = raw;
    try { root.localStorage.setItem(PREFIX + key, raw); } catch (e) { /* keep in memory */ }
  }

  function remove(key) {
    delete memory[key];
    try { root.localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
  }

  var CUSTOM_ID_START = 10001;

  // Copy the built-in levels into storage on first run, or when a newer set ships.
  function seedLevels() {
    var seed = root.KALAMCHIN_SEED;
    var saved = read('levels', null);
    if (!saved || !saved.levels || saved.version < seed.version) {
      saved = { version: seed.version, levels: seed.levels, custom: (saved && saved.custom) || [] };
      write('levels', saved);
    }
    return saved;
  }

  var Store = {
    // Parsed once and kept in memory: the level list is over a megabyte.
    levels: function () { return cache || (cache = read('levels', null) || seedLevels()); },

    builtIn: function () { return Store.levels().levels; },

    custom: function () { return Store.levels().custom || []; },

    level: function (id) {
      var all = Store.levels();
      var list = id >= CUSTOM_ID_START ? all.custom || [] : all.levels;
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    },

    saveCustom: function (custom) {
      var all = Store.levels();
      all.custom = custom;
      write('levels', all);
    },

    addCustom: function (level) {
      var custom = Store.custom();
      var id = CUSTOM_ID_START;
      custom.forEach(function (l) { id = Math.max(id, l.id + 1); });
      level.id = id;
      custom.push(level);
      Store.saveCustom(custom);
      return level;
    },

    removeCustom: function (id) {
      Store.saveCustom(Store.custom().filter(function (l) { return l.id !== id; }));
      Store.clearProgress(id);
      var st = Store.state();
      delete st.done[id];
      Store.saveState(st);
    },

    state: function () {
      var st = read('state', null);
      if (!st) st = { coins: root.KConfig.START_COINS, current: 1, done: {}, extraMeter: 0, extraTotal: 0 };
      st.done = st.done || {};
      return st;
    },

    saveState: function (st) { write('state', st); },

    // Progress is kept per level, so replaying an old level does not wipe the current one.
    progress: function (levelId) {
      var all = read('progress', null);
      var p = all && !all.levelId ? all[levelId] : null;
      return p || { levelId: levelId, found: [], revealed: [], extras: [] };
    },

    saveProgress: function (p) {
      var all = read('progress', null);
      if (!all || all.levelId) all = {};
      all[p.levelId] = p;
      write('progress', all);
    },

    clearProgress: function (levelId) {
      var all = read('progress', null);
      if (!all || all.levelId) return;
      delete all[levelId];
      write('progress', all);
    },

    // Clears coins and progress; the player's own levels stay.
    resetAll: function () {
      remove('state');
      remove('progress');
    },

    isCustomId: function (id) { return id >= CUSTOM_ID_START; },

    init: seedLevels
  };

  root.KStore = Store;
})(this);
