/*
 * Passcode screen. Keeps casual visitors out; it is not real security (the code is in this file).
 * Once a browser enters the right code it is remembered, until PASSCODE changes.
 */
(function (root) {
  'use strict';

  var PASSCODE = '1404';
  var KEY = 'kalamchin.unlocked';
  var FA = '۰۱۲۳۴۵۶۷۸۹';

  function unlocked() {
    try { return root.localStorage.getItem(KEY) === PASSCODE; } catch (e) { return false; }
  }

  var waiting = [];
  var isOpen = unlocked();
  if (!isOpen) document.documentElement.classList.add('locked');

  function open() {
    isOpen = true;
    try { root.localStorage.setItem(KEY, PASSCODE); } catch (e) { /* ask again next time */ }
    document.documentElement.classList.remove('locked');
    var el = document.getElementById('lock');
    if (el) el.remove();
    waiting.splice(0).forEach(function (fn) { fn(); });
  }

  function build() {
    var typed = '';
    var el = document.createElement('div');
    el.id = 'lock';
    el.innerHTML =
      '<div class="lock-box">' +
      '<div class="lock-title">کلمچین</div>' +
      '<p>رمز ورود را وارد کنید</p>' +
      '<div class="lock-dots"><i></i><i></i><i></i><i></i></div>' +
      '<div class="lock-keys">' +
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (d) { return '<button data-d="' + d + '">' + FA[d] + '</button>'; }).join('') +
      '<span></span><button data-d="0">' + FA[0] + '</button><button data-back aria-label="پاک کردن">⌫</button>' +
      '</div></div>';
    document.body.appendChild(el);
    var dots = el.querySelectorAll('.lock-dots i');

    function render() {
      dots.forEach(function (d, i) { d.classList.toggle('on', i < typed.length); });
    }

    function press(d) {
      if (typed.length >= 4) return;
      typed += d;
      render();
      if (typed.length < 4) return;
      if (typed === PASSCODE) { setTimeout(open, 150); return; }
      var box = el.querySelector('.lock-dots');
      box.classList.add('wrong');
      setTimeout(function () { box.classList.remove('wrong'); typed = ''; render(); }, 450);
    }

    el.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-back')) { typed = typed.slice(0, -1); render(); }
      else press(b.dataset.d);
    });
    document.addEventListener('keydown', function (e) {
      if (isOpen) return;
      var d = FA.indexOf(e.key) >= 0 ? String(FA.indexOf(e.key)) : e.key;
      if (/^[0-9]$/.test(d)) press(d);
      else if (e.key === 'Backspace') { typed = typed.slice(0, -1); render(); }
    });
  }

  root.KLock = {
    // Runs fn once the page has loaded and the passcode was entered.
    ready: function (fn) {
      document.addEventListener('DOMContentLoaded', function () {
        if (isOpen) fn();
        else { waiting.push(fn); build(); }
      });
    }
  };
})(this);
