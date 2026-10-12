/*
 * Everything the game keeps lives in localStorage:
 *   kalamchin.chunk.N   built-in levels, 100 per entry, saved as each file is downloaded
 *   kalamchin.custom    levels made by the player
 *   kalamchin.state     coins, current level, finished levels, extra-word meter
 *   kalamchin.progress  unfinished levels: {levelId: {found words, hinted cells, extras}}
 *   kalamchin.settings  preferences such as sound (off unless the player turns it on)
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

  function write(key, value) {
    var raw = JSON.stringify(value);
    memory[key] = raw;
    try { root.localStorage.setItem(PREFIX + key, raw); } catch (e) { /* keep in memory */ }
  }

  function remove(key) {
    delete memory[key];
    try { root.localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
  }

  var CUSTOM_ID_START = 10001;

  /*
   * Built-in levels come in files of 100 (data/levels/NNN.js). data/levels/index.js lists them
   * with a fingerprint each. A file is downloaded the first time a player reaches it, then kept
   * in localStorage as kalamchin.chunk.N; it is downloaded again only if its fingerprint changes.
   */
  var INDEX = root.KALAMCHIN_LEVELS; // {total, size, chunks: [fingerprint, ...]}
  var chunks = {};   // chunk number -> levels, in memory
  var waiting = {};  // chunk number -> callbacks while its file downloads

  function chunkOf(id) { return Math.floor((id - 1) / INDEX.size); }

  function chunkFile(n) { return 'data/levels/' + ('00' + (n + 1)).slice(-3) + '.js?h=' + INDEX.chunks[n]; }

  // Ready in memory or localStorage? (Never downloads.)
  function haveChunk(n) {
    if (chunks[n]) return true;
    var saved = read('chunk.' + n, null);
    if (saved && saved.h === INDEX.chunks[n]) { chunks[n] = saved.levels; return true; }
    return false;
  }

  // Chunk files call this when they load.
  root.KALAMCHIN_CHUNK = function (n, levels) {
    chunks[n] = levels;
    write('chunk.' + n, { h: INDEX.chunks[n], levels: levels });
    (waiting[n] || []).splice(0).forEach(function (fn) { fn(true); });
  };

  function loadChunk(n, done) {
    if (n < 0 || n >= INDEX.chunks.length) { done(false); return; }
    if (haveChunk(n)) { done(true); return; }
    if (waiting[n]) { waiting[n].push(done); return; }
    waiting[n] = [done];
    var script = document.createElement('script');
    script.src = chunkFile(n);
    script.onerror = function () {
      script.remove();
      (waiting[n] || []).splice(0).forEach(function (fn) { fn(false); });
      delete waiting[n];
    };
    document.head.appendChild(script);
  }

  // Older versions kept every level in one big kalamchin.levels entry; keep only the custom ones.
  function migrate() {
    var old = read('levels', null);
    if (!old) return;
    if (old.custom && old.custom.length && !read('custom', null)) write('custom', old.custom);
    remove('levels');
  }

  var Store = {
    total: function () { return INDEX.total; },

    // The level if it is already available, otherwise null (see loadLevel).
    level: function (id) {
      if (id >= CUSTOM_ID_START) {
        var custom = Store.custom();
        for (var i = 0; i < custom.length; i++) if (custom[i].id === id) return custom[i];
        return null;
      }
      if (id < 1 || id > INDEX.total || !haveChunk(chunkOf(id))) return null;
      return chunks[chunkOf(id)][(id - 1) % INDEX.size] || null;
    },

    // Calls done(level or null) once the level's file is available; also fetches the next
    // file ahead of time when the player is in the last 20 levels of this one.
    loadLevel: function (id, done) {
      if (id >= CUSTOM_ID_START) { done(Store.level(id)); return; }
      var n = chunkOf(id);
      loadChunk(n, function () { done(Store.level(id)); });
      if ((id - 1) % INDEX.size >= INDEX.size - 20) loadChunk(n + 1, function () {});
    },

    custom: function () { return read('custom', []); },

    saveCustom: function (custom) { write('custom', custom); },

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

    // Player preferences (sound...). Kept apart from state so starting over keeps them.
    setting: function (name, fallback) {
      var s = read('settings', {});
      return name in s ? s[name] : fallback;
    },

    saveSetting: function (name, value) {
      var s = read('settings', {});
      s[name] = value;
      write('settings', s);
    },

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

    // Calls done once the player's current level is available.
    init: function (done) {
      migrate();
      var st = Store.state();
      Store.loadLevel(Math.min(Math.max(st.current, 1), INDEX.total), function () { done(); });
    }
  };

  root.KStore = Store;
})(this);
