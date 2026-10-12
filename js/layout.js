/*
 * Crossword layout engine. Shared by the game (custom levels) and tools/generate_levels.js.
 *
 * Coordinates: r grows downward, c grows to the LEFT (column 0 is the rightmost one),
 * because Persian reads right to left. A horizontal word puts letter i at (r, c + i),
 * a vertical word puts letter i at (r + i, c).
 */
(function (root) {
  'use strict';

  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function shuffle(arr, rand) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function Grid() {
    this.cells = {};   // "r,c" -> {ch, h: bool, v: bool}
    this.words = [];
    this.minR = 0; this.maxR = 0; this.minC = 0; this.maxC = 0;
  }
  Grid.prototype.get = function (r, c) { return this.cells[r + ',' + c]; };
  Grid.prototype.clone = function () {
    var g = new Grid();
    for (var k in this.cells) {
      var x = this.cells[k];
      g.cells[k] = { ch: x.ch, h: x.h, v: x.v };
    }
    g.words = this.words.slice();
    g.minR = this.minR; g.maxR = this.maxR; g.minC = this.minC; g.maxC = this.maxC;
    return g;
  };

  // Returns the number of crossings, or -1 when the word cannot go there.
  Grid.prototype.check = function (w, r, c, d, maxRows, maxCols) {
    var dr = d === 'v' ? 1 : 0, dc = d === 'h' ? 1 : 0;
    var n = w.length;
    if (this.get(r - dr, c - dc) || this.get(r + dr * n, c + dc * n)) return -1;
    var minR = Math.min(this.minR, r), maxR = Math.max(this.maxR, r + dr * (n - 1));
    var minC = Math.min(this.minC, c), maxC = Math.max(this.maxC, c + dc * (n - 1));
    if (maxR - minR + 1 > maxRows || maxC - minC + 1 > maxCols) return -1;
    var crossings = 0;
    for (var i = 0; i < n; i++) {
      var rr = r + dr * i, cc = c + dc * i;
      var cell = this.get(rr, cc);
      if (cell) {
        if (cell.ch !== w[i] || cell[d]) return -1;
        crossings++;
      } else if (d === 'h') {
        if (this.get(rr - 1, cc) || this.get(rr + 1, cc)) return -1;
      } else if (this.get(rr, cc - 1) || this.get(rr, cc + 1)) {
        return -1;
      }
    }
    if (crossings === n) return -1; // would sit completely on top of other words
    return crossings;
  };

  Grid.prototype.place = function (w, r, c, d) {
    var dr = d === 'v' ? 1 : 0, dc = d === 'h' ? 1 : 0;
    for (var i = 0; i < w.length; i++) {
      var rr = r + dr * i, cc = c + dc * i, k = rr + ',' + cc;
      var cell = this.cells[k] || (this.cells[k] = { ch: w[i], h: false, v: false });
      cell[d] = true;
    }
    if (this.words.length === 0) {
      this.minR = r; this.minC = c; this.maxR = r; this.maxC = c;
    }
    this.minR = Math.min(this.minR, r); this.maxR = Math.max(this.maxR, r + dr * (w.length - 1));
    this.minC = Math.min(this.minC, c); this.maxC = Math.max(this.maxC, c + dc * (w.length - 1));
    this.words.push({ w: w, r: r, c: c, d: d });
  };

  Grid.prototype.candidates = function (w, maxRows, maxCols) {
    var out = [];
    for (var k in this.cells) {
      var cell = this.cells[k];
      var p = k.split(','), r = +p[0], c = +p[1];
      for (var i = 0; i < w.length; i++) {
        if (w[i] !== cell.ch) continue;
        if (!cell.h) {
          var x = this.check(w, r, c - i, 'h', maxRows, maxCols);
          if (x > 0) out.push({ r: r, c: c - i, d: 'h', x: x });
        }
        if (!cell.v) {
          var y = this.check(w, r - i, c, 'v', maxRows, maxCols);
          if (y > 0) out.push({ r: r - i, c: c, d: 'v', x: y });
        }
      }
    }
    return out;
  };

  function area(g, cand, w) {
    var dr = cand.d === 'v' ? 1 : 0, dc = cand.d === 'h' ? 1 : 0;
    var rows = Math.max(g.maxR, cand.r + dr * (w.length - 1)) - Math.min(g.minR, cand.r) + 1;
    var cols = Math.max(g.maxC, cand.c + dc * (w.length - 1)) - Math.min(g.minC, cand.c) + 1;
    // The board area on a phone is a little wider than tall.
    return rows * cols + Math.abs(rows - cols * 0.85) * 2;
  }

  function attempt(words, rand, maxRows, maxCols) {
    var g = new Grid();
    var order = words.slice(1);
    shuffle(order, rand);
    order.sort(function (a, b) { return b.length - a.length; });
    // Keep some randomness among equal lengths, but put the first (base) word down first.
    var first = words[0];
    g.place(first, 0, 0, rand() < 0.75 ? 'h' : 'v');
    var pending = order, progress = true;
    while (pending.length && progress) {
      progress = false;
      var rest = [];
      for (var i = 0; i < pending.length; i++) {
        var w = pending[i];
        var cands = g.candidates(w, maxRows, maxCols);
        if (!cands.length) { rest.push(w); continue; }
        var best = null, bestScore = Infinity;
        for (var j = 0; j < cands.length; j++) {
          var s = area(g, cands[j], w) - cands[j].x * 6 + rand() * 3;
          if (s < bestScore) { bestScore = s; best = cands[j]; }
        }
        g.place(w, best.r, best.c, best.d);
        progress = true;
      }
      pending = rest;
    }
    return g;
  }

  /*
   * words: array of strings, words[0] is placed first (usually the longest one).
   * Returns {words: [{w, r, c, d}], rows, cols, skipped: [...]}.
   */
  function layout(words, opts) {
    opts = opts || {};
    var rand = rng(opts.seed || 12345);
    var tries = opts.tries || 60;
    var maxRows = opts.maxRows || 10, maxCols = opts.maxCols || 10;
    var best = null, bestScore = -Infinity;
    for (var t = 0; t < tries; t++) {
      var g = attempt(words, rand, maxRows, maxCols);
      var rows = g.maxR - g.minR + 1, cols = g.maxC - g.minC + 1;
      var crossings = 0;
      for (var k in g.cells) if (g.cells[k].h && g.cells[k].v) crossings++;
      var score = g.words.length * 1000 - rows * cols * 3 - Math.abs(rows - cols) * 4 + crossings * 5;
      if (score > bestScore) { bestScore = score; best = g; }
    }
    var placed = best.words.map(function (p) {
      return { w: p.w, r: p.r - best.minR, c: p.c - best.minC, d: p.d };
    });
    var used = {};
    placed.forEach(function (p) { used[p.w] = true; });
    return {
      words: placed,
      rows: best.maxR - best.minR + 1,
      cols: best.maxC - best.minC + 1,
      skipped: words.filter(function (w) { return !used[w]; })
    };
  }

  var api = { layout: layout, rng: rng, shuffle: shuffle };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KLayout = api;
})(this);
