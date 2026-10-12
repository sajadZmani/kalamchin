/* Screens, navigation, popups. */
(function (root) {
  'use strict';

  var C = root.KConfig, S = root.KStore, G = root.KGame, fa = C.fa;

  function $(id) { return document.getElementById(id); }

  var App = {
    show: function (name) {
      ['home', 'map', 'game'].forEach(function (s) { $(s).classList.toggle('hidden', s !== name); });
      App.renderCoins();
    },

    renderCoins: function () {
      var coins = fa(S.state().coins);
      document.querySelectorAll('.coins-value').forEach(function (el) { el.textContent = coins; });
    },

    toast: function (text) {
      var t = $('toast');
      t.textContent = text;
      t.classList.add('show');
      clearTimeout(App.toastTimer);
      App.toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1600);
    },

    modal: function (html, onClick) {
      var m = $('modal'), box = $('modal-box');
      box.innerHTML = html;
      m.classList.remove('hidden');
      App.modalClick = onClick || null;
    },

    closeModal: function () { $('modal').classList.add('hidden'); },

    /* ---------- home ---------- */

    home: function () {
      var st = S.state(), total = S.builtIn().length;
      var cur = Math.min(st.current, total);
      var ch = C.chapterOf(cur);
      $('play-level').textContent = st.current > total ? 'همه مراحل تمام شد!' : ch.name + ' · مرحله ' + fa(cur);
      var hs = $('home').style;
      hs.setProperty('--accent', ch.accent);
      hs.setProperty('--bg1', ch.bg1);
      hs.setProperty('--bg2', ch.bg2);
      App.show('home');
      history.replaceState(null, '', location.pathname);
    },

    play: function (id) {
      App.closeModal();
      App.show('game');
      if (!G.start(id)) { App.toast('این مرحله پیدا نشد'); App.home(); return; }
      history.replaceState(null, '', '#play=' + id);
    },

    playCurrent: function () {
      var st = S.state(), total = S.builtIn().length;
      App.play(Math.min(st.current, total));
    },

    /* ---------- level map ---------- */

    map: function () {
      var st = S.state(), levels = S.builtIn(), per = C.LEVELS_PER_CHAPTER;
      var html = '';
      for (var start = 0; start < levels.length; start += per) {
        var ch = C.chapterOf(levels[start].id);
        var done = 0, cells = '';
        for (var i = start; i < Math.min(start + per, levels.length); i++) {
          var id = levels[i].id, cls = 'lvl';
          if (st.done[id]) { cls += ' done'; done++; }
          else if (id === st.current) cls += ' current';
          else if (id > st.current) cls += ' locked';
          cells += '<button class="' + cls + '" data-level="' + id + '"' + (id > st.current ? ' disabled' : '') + '>' + fa(id) + '</button>';
        }
        var locked = levels[start].id > st.current;
        html += '<div class="chapter' + (locked ? ' locked' : '') + '" style="--accent:' + ch.accent + ';--bg1:' + ch.bg1 + ';--bg2:' + ch.bg2 + '">' +
          '<div class="chapter-head"><b>' + ch.name + '</b><span>' + fa(done) + ' از ' + fa(Math.min(per, levels.length - start)) + '</span></div>' +
          '<div class="chapter-levels">' + cells + '</div></div>';
      }
      var custom = S.custom();
      if (custom.length) {
        var cc = C.CUSTOM_CHAPTER, cl = '';
        custom.forEach(function (l) {
          cl += '<button class="lvl' + (st.done[l.id] ? ' done' : '') + '" data-level="' + l.id + '" title="' + (l.name || '') + '">' +
            fa(l.id - 10000) + '</button>';
        });
        html += '<div class="chapter" style="--accent:' + cc.accent + ';--bg1:' + cc.bg1 + ';--bg2:' + cc.bg2 + '">' +
          '<div class="chapter-head"><b>' + cc.name + '</b><a href="editor.html">ویرایش</a></div>' +
          '<div class="chapter-levels">' + cl + '</div></div>';
      }
      $('chapters').innerHTML = html;
      App.show('map');
      var cur = $('chapters').querySelector('.lvl.current');
      if (cur) cur.scrollIntoView({ block: 'center' });
    },

    /* ---------- popups ---------- */

    complete: function (res) {
      var lv = res.level, custom = S.isCustomId(lv.id), total = S.builtIn().length;
      var hasNext = !custom && lv.id < total;
      var html = '<div class="win-title">آفرین!</div>' +
        '<p>' + (custom ? 'مرحله «' + (lv.name || 'من') + '» تمام شد.' : 'مرحله ' + fa(lv.id) + ' تمام شد.') + '</p>' +
        (res.chapterDone ? '<p class="big">فصل ' + C.chapterOf(lv.id).name + ' تمام شد!</p>' : '') +
        (res.reward ? '<div class="reward"><i class="coin"></i> +' + fa(res.reward) + '</div>' : '') +
        (res.extras ? '<p class="muted">' + fa(res.extras) + ' کلمه اضافه پیدا کردید.</p>' : '') +
        (hasNext ? '<button class="btn" data-act="next">مرحله بعد</button>' : '') +
        '<button class="btn ghost" data-act="home">خانه</button>';
      App.modal(html, function (act) {
        if (act === 'next') App.play(lv.id + 1);
        else { App.closeModal(); App.home(); }
      });
    },

    settings: function () {
      var st = S.state();
      var html = '<h2>تنظیمات</h2>' +
        '<p class="muted">همه چیز فقط در همین مرورگر ذخیره می‌شود.</p>' +
        '<p>مراحل تمام‌شده: ' + fa(Object.keys(st.done).length) + ' · کلمات اضافه: ' + fa(st.extraTotal) + '</p>' +
        '<a class="btn ghost" href="editor.html">ساخت و مدیریت مراحل</a>' +
        '<button class="btn danger" data-act="reset">شروع دوباره بازی</button>' +
        '<button class="btn" data-close>بستن</button>';
      App.modal(html, function (act) {
        if (act === 'reset') {
          if (!confirm('همه سکه‌ها و پیشرفت پاک شود؟')) return;
          S.resetAll();
          App.closeModal();
          App.home();
          App.toast('بازی از اول شروع شد');
        }
      });
    },

    help: function () {
      App.modal('<h2>راهنما</h2>' +
        '<p>انگشت را روی حروف دایره بکشید تا کلمه بسازید. کلمه‌های جدول را پیدا کنید.</p>' +
        '<p>کلمه درستی که در جدول نیست «کلمه اضافه» است. هر ' + fa(C.EXTRA_GOAL) + ' کلمه اضافه ' + fa(C.EXTRA_REWARD) + ' سکه می‌دهد.</p>' +
        '<p><b>لامپ</b>: یک حرف از اولین کلمه پیدا نشده را باز می‌کند (' + fa(C.HINT_LETTER_COST) + ' سکه).<br>' +
        '<b>انگشت</b>: هر خانه‌ای را که بخواهید باز می‌کند (' + fa(C.HINT_CELL_COST) + ' سکه).<br>' +
        '<b>چرخش</b>: جای حروف را عوض می‌کند (رایگان).</p>' +
        '<button class="btn" data-close>فهمیدم</button>');
    },

    init: function () {
      S.init();
      G.bind();
      G.onComplete = App.complete;
      $('play-btn').addEventListener('click', App.playCurrent);
      $('map-btn').addEventListener('click', App.map);
      $('settings-btn').addEventListener('click', App.settings);
      $('help-btn').addEventListener('click', App.help);
      $('game-back').addEventListener('click', App.home);
      $('map-back').addEventListener('click', App.home);
      $('chapters').addEventListener('click', function (e) {
        var b = e.target.closest('[data-level]');
        if (b && !b.disabled) App.play(+b.dataset.level);
      });
      $('modal').addEventListener('click', function (e) {
        if (e.target.id === 'modal' || e.target.closest('[data-close]')) { App.closeModal(); return; }
        var a = e.target.closest('[data-act]');
        if (a && App.modalClick) App.modalClick(a.dataset.act);
      });
      var m = /#play=(\d+)/.exec(location.hash);
      if (m && S.level(+m[1]) && (S.isCustomId(+m[1]) || +m[1] <= S.state().current)) App.play(+m[1]);
      else App.home();
      if (!S.state().seenHelp) {
        var st = S.state(); st.seenHelp = true; S.saveState(st);
        App.help();
      }
    }
  };

  root.KApp = App;
  root.KLock.ready(App.init);
})(this);
