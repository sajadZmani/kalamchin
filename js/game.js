/* The game screen: board, letter wheel and the rules. */
(function (root) {
  'use strict';

  var C = root.KConfig, S = root.KStore, fa = C.fa;
  var DICT = null;

  function dict() {
    if (!DICT) DICT = new Set((root.KALAMCHIN_DICT || '').split(' '));
    return DICT;
  }

  function $(id) { return document.getElementById(id); }

  function cellsOf(entry) {
    var w = entry[0], r = entry[1], c = entry[2], d = entry[3], out = [];
    for (var i = 0; i < w.length; i++) out.push(d === 'v' ? (r + i) + ',' + c : r + ',' + (c + i));
    return out;
  }

  var Game = {
    level: null,
    progress: null,
    letters: [],       // wheel order
    selected: [],      // indexes into letters
    pickMode: false,
    onExit: null,
    onComplete: null,

    start: function (levelId) {
      var level = S.level(levelId);
      if (!level) return false;
      this.level = level;
      this.chapter = C.chapterOf(level.id);
      this.progress = S.progress(level.id);
      this.letters = level.letters.split('');
      this.selected = [];
      this.pickMode = false;
      // Cells per word and the letter in each cell.
      this.cellLetter = {};
      this.wordCells = {};
      var self = this;
      level.words.forEach(function (e) {
        var cells = cellsOf(e);
        self.wordCells[e[0]] = cells;
        cells.forEach(function (k, i) { self.cellLetter[k] = e[0][i]; });
      });
      // First unfinished word for the letter hint: reading order (top first, then right first).
      this.hintOrder = level.words.slice().sort(function (a, b) { return a[1] - b[1] || a[2] - b[2]; })
        .map(function (e) { return e[0]; });
      // Saved progress may come from an older version of this level; drop what no longer fits.
      var pr = this.progress;
      pr.found = pr.found.filter(function (w) { return self.wordCells[w]; });
      pr.revealed = pr.revealed.filter(function (k) { return self.cellLetter[k]; });
      S.saveProgress(this.progress);
      this.applyTheme();
      this.renderTitle();
      this.renderBoard();
      this.renderWheel();
      this.renderButtons();
      return true;
    },

    applyTheme: function () {
      var ch = this.chapter, s = $('game').style;
      s.setProperty('--accent', ch.accent);
      s.setProperty('--bg1', ch.bg1);
      s.setProperty('--bg2', ch.bg2);
    },

    renderTitle: function () {
      var id = this.level.id;
      var name = S.isCustomId(id)
        ? (this.level.name || C.CUSTOM_CHAPTER.name)
        : this.chapter.name + ' · مرحله ' + fa(id);
      $('game-title').textContent = name;
      root.KApp.renderCoins();
    },

    isRevealed: function (k) {
      if (this.progress.revealed.indexOf(k) >= 0) return true;
      var f = this.progress.found;
      for (var i = 0; i < f.length; i++) if (this.wordCells[f[i]].indexOf(k) >= 0) return true;
      return false;
    },

    isFoundCell: function (k) {
      var f = this.progress.found;
      for (var i = 0; i < f.length; i++) if (this.wordCells[f[i]].indexOf(k) >= 0) return true;
      return false;
    },

    renderBoard: function () {
      var lv = this.level, board = $('board'), wrap = $('board-wrap');
      var gap = 4;
      var w = wrap.clientWidth - 36, h = wrap.clientHeight - 16; // minus padding
      var size = Math.floor(Math.min((w - gap * (lv.cols - 1)) / lv.cols, (h - gap * (lv.rows - 1)) / lv.rows, 62));
      size = Math.max(size, 18);
      board.style.gridTemplateColumns = 'repeat(' + lv.cols + ', ' + size + 'px)';
      board.style.gridTemplateRows = 'repeat(' + lv.rows + ', ' + size + 'px)';
      board.style.gap = gap + 'px';
      board.style.fontSize = Math.round(size * 0.58) + 'px';
      board.classList.toggle('picking', this.pickMode);
      board.innerHTML = '';
      var self = this;
      Object.keys(this.cellLetter).forEach(function (k) {
        var p = k.split(','), cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.key = k;
        cell.style.gridRow = (+p[0] + 1);
        cell.style.gridColumn = (+p[1] + 1);
        cell.style.borderRadius = Math.round(size * 0.18) + 'px';
        if (self.isFoundCell(k)) { cell.classList.add('found'); cell.textContent = self.cellLetter[k]; }
        else if (self.isRevealed(k)) { cell.classList.add('hinted'); cell.textContent = self.cellLetter[k]; }
        board.appendChild(cell);
      });
    },

    flashWord: function (word) {
      this.wordCells[word].forEach(function (k) {
        var el = document.querySelector('#board .cell[data-key="' + k + '"]');
        if (!el) return;
        el.classList.remove('flash');
        void el.offsetWidth;
        el.classList.add('flash');
      });
    },

    /* ---------- wheel ---------- */

    renderWheel: function () {
      var wheel = $('wheel'), n = this.letters.length;
      wheel.querySelectorAll('.letter').forEach(function (el) { el.remove(); });
      var size = wheel.clientWidth;
      var letterSize = Math.round(size * (n <= 4 ? 0.27 : n <= 5 ? 0.25 : n <= 6 ? 0.23 : 0.21));
      var radius = size / 2 - letterSize / 2 - size * 0.06;
      if (n === 1) radius = 0;
      this.letterPos = [];
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + (2 * Math.PI * i) / n;
        var x = size / 2 + radius * Math.cos(a), y = size / 2 + radius * Math.sin(a);
        var el = document.createElement('div');
        el.className = 'letter';
        el.textContent = this.letters[i];
        el.style.width = el.style.height = letterSize + 'px';
        el.style.left = (x - letterSize / 2) + 'px';
        el.style.top = (y - letterSize / 2) + 'px';
        el.style.fontSize = Math.round(letterSize * 0.6) + 'px';
        el.dataset.i = i;
        wheel.appendChild(el);
        this.letterPos.push({ x: x, y: y, r: letterSize / 2 });
      }
      this.drawLine(null);
      this.updatePreview();
    },

    letterAt: function (x, y) {
      for (var i = 0; i < this.letterPos.length; i++) {
        var p = this.letterPos[i], dx = x - p.x, dy = y - p.y;
        if (dx * dx + dy * dy <= p.r * p.r * 1.1) return i;
      }
      return -1;
    },

    pointer: function (type, e) {
      var rect = $('wheel').getBoundingClientRect();
      var x = e.clientX - rect.left, y = e.clientY - rect.top;
      if (type === 'down') {
        var i = this.letterAt(x, y);
        if (i < 0) return;
        this.dragging = true;
        this.selected = [i];
      } else if (type === 'move') {
        if (!this.dragging) return;
        var j = this.letterAt(x, y);
        if (j >= 0) {
          var at = this.selected.indexOf(j);
          if (at < 0) this.selected.push(j);
          else if (at === this.selected.length - 2) this.selected.pop(); // slide back to undo
        }
      } else {
        if (!this.dragging) return;
        this.dragging = false;
        this.drawLine(null);
        this.submit();
        return;
      }
      this.drawLine({ x: x, y: y });
      this.updatePreview();
    },

    drawLine: function (finger) {
      var svg = $('wheel-line'), size = $('wheel').clientWidth;
      svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
      var self = this;
      var pts = this.selected.map(function (i) { return self.letterPos[i].x + ',' + self.letterPos[i].y; });
      if (finger && pts.length) pts.push(finger.x + ',' + finger.y);
      svg.innerHTML = pts.length > 1
        ? '<polyline points="' + pts.join(' ') + '" />'
        : '';
      var letters = $('wheel').querySelectorAll('.letter');
      letters.forEach(function (el) { el.classList.toggle('on', self.selected.indexOf(+el.dataset.i) >= 0); });
    },

    currentWord: function () {
      var self = this;
      return this.selected.map(function (i) { return self.letters[i]; }).join('');
    },

    updatePreview: function (state) {
      var p = $('preview'), word = this.currentWord();
      clearTimeout(this.previewTimer);
      p.className = state || '';
      if (word) { p.textContent = word; p.classList.add('show'); }
      else if (!state) { p.textContent = ''; }
    },

    showResult: function (word, state) {
      var p = $('preview');
      p.textContent = word;
      p.className = 'show ' + state;
      clearTimeout(this.previewTimer);
      this.previewTimer = setTimeout(function () { p.className = ''; p.textContent = ''; }, 700);
    },

    /* ---------- rules ---------- */

    submit: function () {
      var word = this.currentWord();
      this.selected = [];
      this.drawLine(null);
      if (word.length < 2) { this.updatePreview(); return; }
      var pr = this.progress;
      if (this.wordCells[word]) {
        if (pr.found.indexOf(word) >= 0) {
          this.showResult(word, 'dup');
          this.flashWord(word);
          return;
        }
        pr.found.push(word);
        this.showResult(word, 'ok');
        this.afterReveal();
        this.flashWord(word);
        return;
      }
      if (word.length >= (this.level.minLen || 2) && dict().has(word)) {
        if (pr.extras.indexOf(word) >= 0) {
          this.showResult(word, 'dup');
          root.KApp.toast('این کلمه اضافه را قبلا پیدا کرده‌اید');
          return;
        }
        pr.extras.push(word);
        S.saveProgress(pr);
        this.showResult(word, 'extra');
        var st = S.state();
        st.extraMeter += 1;
        st.extraTotal += 1;
        if (st.extraMeter >= C.EXTRA_GOAL) {
          st.extraMeter = 0;
          st.coins += C.EXTRA_REWARD;
          root.KApp.toast('کلمات اضافه کامل شد! ' + fa(C.EXTRA_REWARD) + ' سکه جایزه');
        } else {
          root.KApp.toast('کلمه اضافه!');
        }
        S.saveState(st);
        this.renderButtons();
        root.KApp.renderCoins();
        return;
      }
      this.showResult(word, 'bad');
    },

    // Words whose cells were all opened by hints count as found.
    afterReveal: function () {
      var pr = this.progress, self = this;
      this.level.words.forEach(function (e) {
        var w = e[0];
        if (pr.found.indexOf(w) >= 0) return;
        if (self.wordCells[w].every(function (k) { return self.isRevealed(k); })) pr.found.push(w);
      });
      S.saveProgress(pr);
      this.renderBoard();
      if (pr.found.length === this.level.words.length) {
        var self2 = this;
        setTimeout(function () { self2.complete(); }, 450);
      }
    },

    spend: function (cost) {
      var st = S.state();
      if (st.coins < cost) {
        root.KApp.toast('سکه کافی ندارید');
        return false;
      }
      st.coins -= cost;
      S.saveState(st);
      root.KApp.renderCoins();
      return true;
    },

    revealCell: function (k) {
      this.progress.revealed.push(k);
      this.afterReveal();
    },

    hintLetter: function () {
      for (var i = 0; i < this.hintOrder.length; i++) {
        var w = this.hintOrder[i];
        if (this.progress.found.indexOf(w) >= 0) continue;
        var cells = this.wordCells[w];
        for (var j = 0; j < cells.length; j++) {
          if (!this.isRevealed(cells[j])) {
            if (!this.spend(C.HINT_LETTER_COST)) return;
            this.revealCell(cells[j]);
            return;
          }
        }
      }
    },

    togglePick: function () {
      if (!this.pickMode && S.state().coins < C.HINT_CELL_COST) {
        root.KApp.toast('سکه کافی ندارید');
        return;
      }
      this.pickMode = !this.pickMode;
      $('board').classList.toggle('picking', this.pickMode);
      $('btn-pick').classList.toggle('active', this.pickMode);
      if (this.pickMode) root.KApp.toast('روی یک خانه خالی بزنید');
    },

    boardClick: function (e) {
      if (!this.pickMode) return;
      var cell = e.target.closest('.cell');
      if (!cell || this.isRevealed(cell.dataset.key)) return;
      this.pickMode = false;
      $('btn-pick').classList.remove('active');
      if (!this.spend(C.HINT_CELL_COST)) { this.renderBoard(); return; }
      this.revealCell(cell.dataset.key);
    },

    shuffle: function () {
      var old = this.letters.join('');
      if (new Set(this.letters).size < 2) return;
      do { root.KLayout.shuffle(this.letters, Math.random); } while (this.letters.join('') === old);
      this.selected = [];
      this.renderWheel();
    },

    renderButtons: function () {
      var st = S.state();
      $('extra-fill').style.height = Math.round((st.extraMeter / C.EXTRA_GOAL) * 100) + '%';
      $('extra-count').textContent = fa(this.progress.extras.length);
      $('hint-cost').textContent = fa(C.HINT_LETTER_COST);
      $('pick-cost').textContent = fa(C.HINT_CELL_COST);
    },

    showExtras: function () {
      var st = S.state(), ex = this.progress.extras;
      var html = '<h2>کلمات اضافه</h2>' +
        '<p class="muted">کلماتی که درست هستند ولی در جدول نیستند. هر ' + fa(C.EXTRA_GOAL) +
        ' کلمه اضافه ' + fa(C.EXTRA_REWARD) + ' سکه جایزه دارد.</p>' +
        '<div class="meter"><div style="width:' + Math.round((st.extraMeter / C.EXTRA_GOAL) * 100) + '%"></div>' +
        '<span>' + fa(st.extraMeter) + ' از ' + fa(C.EXTRA_GOAL) + '</span></div>' +
        (ex.length
          ? '<div class="chips">' + ex.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>'
          : '<p class="muted">هنوز در این مرحله کلمه اضافه‌ای پیدا نکرده‌اید.</p>') +
        '<button class="btn" data-close>باشه</button>';
      root.KApp.modal(html);
    },

    complete: function () {
      var lv = this.level, st = S.state(), custom = S.isCustomId(lv.id);
      var first = !st.done[lv.id], reward = 0, chapterDone = false;
      if (first) {
        st.done[lv.id] = true;
        reward = C.LEVEL_REWARD;
        if (!custom && lv.id % C.LEVELS_PER_CHAPTER === 0) { reward += C.CHAPTER_REWARD; chapterDone = true; }
        st.coins += reward;
      }
      var builtIn = S.builtIn();
      if (!custom && lv.id >= st.current) st.current = Math.min(lv.id + 1, builtIn.length + 1);
      S.saveState(st);
      S.clearProgress(lv.id);
      root.KApp.renderCoins();
      if (this.onComplete) this.onComplete({ level: lv, reward: reward, chapterDone: chapterDone, extras: this.progress.extras.length });
    },

    bind: function () {
      var self = this, wheel = $('wheel');
      wheel.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        try { wheel.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        self.pointer('down', e);
      });
      wheel.addEventListener('pointermove', function (e) { self.pointer('move', e); });
      wheel.addEventListener('pointerup', function (e) { self.pointer('up', e); });
      wheel.addEventListener('pointercancel', function (e) { self.pointer('up', e); });
      $('board').addEventListener('click', function (e) { self.boardClick(e); });
      $('btn-shuffle').addEventListener('click', function () { self.shuffle(); });
      $('btn-hint').addEventListener('click', function () { self.hintLetter(); });
      $('btn-pick').addEventListener('click', function () { self.togglePick(); });
      $('btn-extra').addEventListener('click', function () { self.showExtras(); });
      var t;
      root.addEventListener('resize', function () {
        clearTimeout(t);
        t = setTimeout(function () {
          if (self.level && !$('game').classList.contains('hidden')) { self.renderBoard(); self.renderWheel(); }
        }, 120);
      });
    }
  };

  root.KGame = Game;
  root.KDict = { has: function (w) { return dict().has(w); } };
})(this);
