/*
 * Game sounds, made with the Web Audio API (no audio files to download).
 * Off by default; the player turns them on in Settings.
 */
(function (root) {
  'use strict';

  var ctx = null;
  var on = null; // cached setting

  function audio() {
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // One soft note: frequency in Hz, start offset and length in seconds.
  function tone(freq, at, len, type, volume) {
    var a = audio();
    if (!a) return;
    var t = a.currentTime + (at || 0);
    var osc = a.createOscillator(), gain = a.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume || 0.18, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + len + 0.05);
  }

  // A major pentatonic scale, so letter sounds always fit together.
  var SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093, 2349, 2637, 3136];

  var SOUNDS = {
    letter: function (n) { tone(SCALE[Math.min(n, SCALE.length - 1)], 0, 0.12, 'triangle', 0.14); },
    found: function () { [659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.07, 0.25, 'triangle'); }); },
    extra: function () { [1319, 1568, 2093].forEach(function (f, i) { tone(f, i * 0.05, 0.18, 'sine', 0.12); }); },
    wrong: function () { tone(196, 0, 0.18, 'square', 0.06); tone(165, 0.1, 0.22, 'square', 0.06); },
    again: function () { tone(440, 0, 0.12, 'sine', 0.1); tone(440, 0.12, 0.12, 'sine', 0.1); },
    hint: function () { tone(880, 0, 0.1, 'sine', 0.14); tone(1320, 0.06, 0.16, 'sine', 0.12); },
    shuffle: function () { [700, 600, 800, 650].forEach(function (f, i) { tone(f, i * 0.04, 0.08, 'triangle', 0.08); }); },
    coins: function () { [1568, 2093, 1568, 2093].forEach(function (f, i) { tone(f, i * 0.06, 0.12, 'square', 0.05); }); },
    win: function () { [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone(f, i * 0.11, i === 5 ? 0.6 : 0.2, 'triangle'); }); }
  };

  root.KSound = {
    enabled: function () {
      if (on === null) on = !!root.KStore.setting('sound', false);
      return on;
    },

    set: function (value) {
      on = !!value;
      root.KStore.saveSetting('sound', on);
      if (on) this.play('found'); // a sample, so the player hears it is on
    },

    play: function (name, arg) {
      if (!this.enabled() || !SOUNDS[name]) return;
      try { SOUNDS[name](arg); } catch (e) { /* audio not available */ }
    }
  };
})(this);
