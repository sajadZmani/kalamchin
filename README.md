# کلمچین

A Persian word game for the browser, inspired by Amirza (آمیرزا). Made for fun, for friends.

Drag across the letters in the wheel to build words and fill the crossword. Real words that
are not on the board count as extra words; collect enough of them for bonus coins. Coins buy
hints. There are 300 levels in 30 chapters, and you can make your own levels.

## Play

No build step. Either:

- open `index.html` in a browser, or
- serve the folder (`python3 -m http.server`) and open `http://localhost:8000`, or
- host it for friends on GitHub Pages (Settings → Pages → deploy from branch → root).

Everything (levels, current level, coins, progress) is saved in the browser's `localStorage`,
so every friend has their own progress.

## Files

| Path | What |
|---|---|
| `index.html`, `js/app.js` | screens: home, level map, popups |
| `js/game.js` | board, letter wheel, rules (words, extras, hints, coins) |
| `js/layout.js` | crossword layout engine (browser + Node) |
| `js/storage.js` | `localStorage` layer |
| `js/config.js` | prices, rewards, chapters and colours |
| `editor.html`, `js/editor.js` | make, export and import your own levels |
| `data/levels.js` | the 300 built-in levels (generated) |
| `data/dict.js` | accepted words for extra words (generated) |
| `tools/` | scripts that generate `data/` |
| `PLAN.md` | research notes and the build plan |

## Regenerating the levels

```sh
pip download hazm wordfreq --no-deps -d wheels && pip install msgpack
# unzip both wheels, then:
python3 tools/extract_words.py hazm/data/words.dat wordfreq/data/small_fa.msgpack.gz wordlists.json
node tools/generate_levels.js wordlists.json
```

If you change the built-in levels, bump `LEVELS_VERSION` in `tools/generate_levels.js` so that
browsers that already played replace their stored copy. Custom levels are kept.

## Credits

- Word data: [hazm](https://github.com/roshan-research/hazm) (MIT) and
  [wordfreq](https://github.com/rspeer/wordfreq) (data CC-BY-SA 4.0).
- Font: [Vazirmatn](https://github.com/rastikerdar/vazirmatn) (SIL OFL 1.1, see `fonts/OFL.txt`).
- Game idea: Amirza. This is an unofficial fan project and is not affiliated with it.
