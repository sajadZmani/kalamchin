/* Level manager: make custom levels, export and import them. */
(function (root) {
  'use strict';

  var S = root.KStore, C = root.KConfig, fa = C.fa;
  var LETTERS = 'آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی';
  var DICT = (root.KALAMCHIN_DICT || '').split(' ');
  var built = null; // last previewed level

  function $(id) { return document.getElementById(id); }

  function clean(text) {
    return text.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[أإ]/g, 'ا').replace(/ة/g, 'ه')
      .split('').filter(function (ch) { return LETTERS.indexOf(ch) >= 0; }).join('');
  }

  function counts(w) {
    var m = {};
    for (var i = 0; i < w.length; i++) m[w[i]] = (m[w[i]] || 0) + 1;
    return m;
  }

  function fits(word, avail) {
    var m = {};
    for (var i = 0; i < word.length; i++) {
      var ch = word[i];
      m[ch] = (m[ch] || 0) + 1;
      if (m[ch] > (avail[ch] || 0)) return false;
    }
    return true;
  }

  function toast(text) {
    var t = $('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }

  function msg(text, isErr) {
    $('msg').textContent = text;
    $('msg').className = 'hint' + (isErr ? ' err' : '');
  }

  function wordsInBox() {
    var seen = {};
    return $('f-words').value.split(/[\n,،\s]+/).map(clean).filter(function (w) {
      if (w.length < 2 || seen[w]) return false;
      seen[w] = true;
      return true;
    });
  }

  function suggest() {
    var letters = clean($('f-letters').value);
    $('f-letters').value = letters;
    var box = $('suggest');
    if (letters.length < 3) { box.innerHTML = '<span class="hint err">حداقل ۳ حرف بنویسید.</span>'; return; }
    var avail = counts(letters), current = wordsInBox();
    var found = DICT.filter(function (w) { return w.length >= 2 && fits(w, avail); });
    // The dictionary is ordered most common first; show long words first, common ones first within a length.
    found = found.slice(0, 60).sort(function (a, b) { return b.length - a.length; });
    box.innerHTML = found.length
      ? found.slice(0, 80).map(function (w) {
        return '<button type="button" class="' + (current.indexOf(w) >= 0 ? 'on' : '') + '" data-w="' + w + '">' + w + '</button>';
      }).join('')
      : '<span class="hint">کلمه‌ای پیدا نشد؛ خودتان بنویسید.</span>';
  }

  function toggleWord(w) {
    var list = wordsInBox(), i = list.indexOf(w);
    if (i >= 0) list.splice(i, 1); else list.push(w);
    $('f-words').value = list.join('\n');
    built = null;
  }

  // Builds a level from letters and words; returns {level} or {error}.
  function buildLevel(letters, words, name) {
    letters = clean(letters);
    if (letters.length < 3 || letters.length > 8) return { error: 'حروف دایره باید بین ۳ تا ۸ حرف باشد.' };
    if (!words.length) return { error: 'حداقل یک کلمه لازم است.' };
    var avail = counts(letters);
    var bad = words.filter(function (w) { return !fits(w, avail); });
    if (bad.length) return { error: 'این کلمه‌ها با حروف دایره ساخته نمی‌شوند: ' + bad.join('، ') };
    var ordered = words.slice().sort(function (a, b) { return b.length - a.length; });
    var lay = root.KLayout.layout(ordered, { seed: letters.length * 7919 + words.length, tries: 120, maxRows: 10, maxCols: 10 });
    var shuffled = letters.split('');
    if (new Set(shuffled).size > 1) {
      do { root.KLayout.shuffle(shuffled, Math.random); } while (shuffled.join('') === letters);
    }
    var minLen = Math.min.apply(null, lay.words.map(function (p) { return p.w.length; }));
    return {
      skipped: lay.skipped,
      level: {
        name: (name || '').trim().slice(0, 40),
        letters: shuffled.join(''),
        minLen: Math.max(2, Math.min(3, minLen)),
        rows: lay.rows,
        cols: lay.cols,
        words: lay.words.map(function (p) { return [p.w, p.r, p.c, p.d]; })
      }
    };
  }

  function renderPreview(level) {
    var board = $('preview-board');
    board.innerHTML = '';
    if (!level) return;
    var size = Math.min(34, Math.floor((board.parentNode.clientWidth - 40) / level.cols));
    board.style.gridTemplateColumns = 'repeat(' + level.cols + ', ' + size + 'px)';
    board.style.gridTemplateRows = 'repeat(' + level.rows + ', ' + size + 'px)';
    board.style.gap = '3px';
    board.style.fontSize = Math.round(size * 0.58) + 'px';
    var done = {};
    level.words.forEach(function (e) {
      for (var i = 0; i < e[0].length; i++) {
        var r = e[3] === 'v' ? e[1] + i : e[1], c = e[3] === 'h' ? e[2] + i : e[2], k = r + ',' + c;
        if (done[k]) continue;
        done[k] = true;
        var cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.gridRow = r + 1;
        cell.style.gridColumn = c + 1;
        cell.textContent = e[0][i];
        board.appendChild(cell);
      }
    });
  }

  function preview() {
    var res = buildLevel($('f-letters').value, wordsInBox(), $('f-name').value);
    if (res.error) { msg(res.error, true); renderPreview(null); built = null; return null; }
    built = res.level;
    msg(res.skipped.length
      ? 'این کلمه‌ها در جدول جا نشدند و حذف شدند: ' + res.skipped.join('، ')
      : 'جدول آماده است. اگر چیدمان را دوست ندارید، دوباره پیش‌نمایش بگیرید.', res.skipped.length > 0);
    renderPreview(built);
    return built;
  }

  function save() {
    var level = built || preview();
    if (!level) return;
    S.addCustom(level);
    built = null;
    $('f-words').value = '';
    $('f-letters').value = '';
    $('f-name').value = '';
    $('suggest').innerHTML = '';
    renderPreview(null);
    msg('ذخیره شد!');
    renderList();
  }

  function renderList() {
    var custom = S.custom(), done = S.state().done;
    $('list').innerHTML = custom.length ? custom.map(function (l) {
      return '<div class="item"><div class="grow"><b>' + (l.name || ('مرحله ' + fa(l.id - 10000))) + (done[l.id] ? ' ✓' : '') + '</b>' +
        '<small>' + l.letters.split('').join(' ') + ' · ' + l.words.map(function (e) { return e[0]; }).join('، ') + '</small></div>' +
        '<a class="mini play" href="index.html#play=' + l.id + '">بازی</a>' +
        '<button class="mini del" data-del="' + l.id + '">حذف</button></div>';
    }).join('') : '<p class="hint">هنوز مرحله‌ای نساخته‌اید.</p>';
  }

  function download(name, data) {
    var blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // Accepts full levels ({letters, rows, cols, words: [[w, r, c, d]]}) or simple ones ({letters, words: ["..."]}).
  function importLevel(raw) {
    if (!raw || typeof raw.letters !== 'string' || !Array.isArray(raw.words)) return null;
    var words = raw.words.map(function (e) { return clean(String(Array.isArray(e) ? e[0] : e)); })
      .filter(function (w) { return w.length >= 2; });
    var res = buildLevel(raw.letters, words, raw.name);
    if (res.error) return null;
    var full = Array.isArray(raw.words[0]) && raw.rows > 0 && raw.cols > 0;
    if (full && res.skipped.length === 0 && validLayout(raw)) {
      res.level.rows = raw.rows;
      res.level.cols = raw.cols;
      res.level.words = raw.words.map(function (e) { return [clean(e[0]), +e[1], +e[2], e[3] === 'v' ? 'v' : 'h']; });
    }
    return res.level;
  }

  function validLayout(raw) {
    var g = {};
    return raw.words.every(function (e) {
      var w = clean(String(e[0]));
      for (var i = 0; i < w.length; i++) {
        var r = e[3] === 'v' ? +e[1] + i : +e[1], c = e[3] === 'v' ? +e[2] : +e[2] + i, k = r + ',' + c;
        if (r < 0 || c < 0 || r >= raw.rows || c >= raw.cols) return false;
        if (g[k] && g[k] !== w[i]) return false;
        g[k] = w[i];
      }
      return true;
    });
  }

  function onImport(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try { data = JSON.parse(reader.result); } catch (e) { toast('فایل خراب است'); return; }
      var list = Array.isArray(data) ? data : (data.custom && data.custom.length ? data.custom : data.levels || []);
      var added = 0;
      list.forEach(function (raw) {
        var level = importLevel(raw);
        if (level) { S.addCustom(level); added++; }
      });
      toast(added ? fa(added) + ' مرحله اضافه شد' : 'مرحله معتبری در فایل نبود');
      renderList();
    };
    reader.readAsText(file);
  }

  function init() {
    S.init();
    renderList();
    $('b-suggest').addEventListener('click', suggest);
    $('suggest').addEventListener('click', function (e) {
      var b = e.target.closest('[data-w]');
      if (!b) return;
      toggleWord(b.dataset.w);
      b.classList.toggle('on');
    });
    ['f-letters', 'f-words'].forEach(function (id) { $(id).addEventListener('input', function () { built = null; }); });
    $('b-preview').addEventListener('click', preview);
    $('b-save').addEventListener('click', save);
    $('list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-del]');
      if (b && confirm('این مرحله حذف شود؟')) { S.removeCustom(+b.dataset.del); renderList(); }
    });
    $('b-export').addEventListener('click', function () {
      var custom = S.custom();
      if (!custom.length) { toast('مرحله‌ای برای خروجی نیست'); return; }
      download('kalamchin-my-levels.json', { app: 'kalamchin', custom: custom });
    });
    $('b-export-all').addEventListener('click', function () {
      var all = S.levels();
      download('kalamchin-all-levels.json', { app: 'kalamchin', version: all.version, levels: all.levels, custom: all.custom || [] });
    });
    $('b-import').addEventListener('click', function () { $('f-file').click(); });
    $('f-file').addEventListener('change', function () {
      if (this.files[0]) onImport(this.files[0]);
      this.value = '';
    });
  }

  root.KLock.ready(init);
})(this);
