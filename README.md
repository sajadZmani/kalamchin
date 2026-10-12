# کلمچین

A Persian word game for the browser, inspired by Amirza (آمیرزا). Made for fun, for friends.

Drag across the letters in the wheel to build words and fill the crossword. Real words that
are not on the board count as extra words; collect enough of them for bonus coins. Coins buy
hints. There are 3100 levels (from `levels.txt`) in 310 chapters, and you can make your own levels.

## Play

Online (after GitHub Pages is on): **https://sajadzmani.github.io/kalamchin/**

The game asks for a 4-digit passcode once per browser. It is set as `PASSCODE` in `js/lock.js`;
changing it asks everyone for the new code. It only keeps casual visitors out: anyone who reads
the source can find it.

No build step. Locally, either open `index.html` in a browser or serve the folder
(`python3 -m http.server`) and open `http://localhost:8000`.

Everything (levels, current level, coins, progress) is saved in the browser's `localStorage`,
so every friend has their own progress. Levels come in files of 100: a player downloads a file
only when they reach it (the next one is fetched near the end of the current one), and keeps it
in `localStorage`, so a refresh downloads nothing new.

### Hosting on GitHub Pages

1. Pages on a free account needs a public repo: Settings → General → Danger Zone →
   Change visibility → Public (or use GitHub Pro to keep it private).
2. Settings → Pages → Build and deployment → Source: **Deploy from a branch**, pick the branch
   with the game and the `/ (root)` folder, then Save.
3. After a minute the game is live at `https://sajadzmani.github.io/<repo name>/`. Every push to that
   branch updates it. `.nojekyll` makes GitHub serve the files as they are.

## Files

| Path | What |
|---|---|
| `index.html`, `js/app.js` | screens: home, level map, popups |
| `js/game.js` | board, letter wheel, rules (words, extras, hints, coins) |
| `js/layout.js` | crossword layout engine (browser + Node) |
| `js/storage.js` | `localStorage` layer |
| `js/config.js` | prices, rewards, chapters and colours |
| `js/lock.js` | passcode screen |
| `js/sound.js` | game sounds (Web Audio, no files); off until turned on in Settings |
| `editor.html`, `js/editor.js` | make, export and import your own levels |
| `levels.txt` | the level list: one line per level, words separated by `/` |
| `data/levels/` | the built-in levels with their boards, 100 per file, plus `index.js` (generated from `levels.txt`) |
| `data/dict.js` | accepted words for extra words (generated) |
| `tools/` | scripts that build `data/`, word blocklist |
| `PLAN.md` | research notes and the build plan |

## Changing the levels

Edit `levels.txt` (one line per level: `مرحله‌ی N`, a tab, then the words separated by `/`), then:

```sh
node tools/import_levels.js
```

It builds a crossword for every level, puts every letter the words need on the wheel, writes
`data/levels/` and adds the words to the extra-word dictionary. آ and ا count as the same letter.
Typos and words typed together in the source list are fixed per level in `FIXES` at the top of
`tools/import_levels.js`. Each file's fingerprint is in `data/levels/index.js`, so browsers that
already played download again only the files whose levels changed (coins, current level and
custom levels are kept).

Words in `tools/blocked_words.txt` (swearing, sexual words, insults, drugs, alcohol) are dropped
from the levels and never accepted as extra words; some players are kids.

To rebuild the extra-word dictionary from scratch:

```sh
pip download hazm wordfreq --no-deps -d wheels && pip install msgpack
# unzip both wheels, then:
python3 tools/extract_words.py hazm/data/words.dat wordfreq/data/small_fa.msgpack.gz wordlists.json
node tools/build_dict.js wordlists.json
node tools/import_levels.js
```

## Credits

- Word data: [hazm](https://github.com/roshan-research/hazm) (MIT) and
  [wordfreq](https://github.com/rspeer/wordfreq) (data CC-BY-SA 4.0).
- Font: [Vazirmatn](https://github.com/rastikerdar/vazirmatn) (SIL OFL 1.1, see `fonts/OFL.txt`).
- Game idea: Amirza. This is an unofficial fan project and is not affiliated with it.
