# کلمچین

A Persian word game for the browser, inspired by Amirza (آمیرزا). Made for fun, for friends.

Drag across the letters in the wheel to build words and fill the crossword. Real words that
are not on the board count as extra words; collect enough of them for bonus coins. Coins buy
hints. There are 1000 levels in 100 chapters, and you can make your own levels.

## Play

Online (after GitHub Pages is on): **https://sajadzmani.github.io/kalamchin/**

The game asks for a 4-digit passcode once per browser. It is set as `PASSCODE` in `js/lock.js`;
changing it asks everyone for the new code. It only keeps casual visitors out: anyone who reads
the source can find it.

No build step. Locally, either open `index.html` in a browser or serve the folder
(`python3 -m http.server`) and open `http://localhost:8000`.

Everything (levels, current level, coins, progress) is saved in the browser's `localStorage`,
so every friend has their own progress.

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
| `editor.html`, `js/editor.js` | make, export and import your own levels |
| `data/levels.js` | the 1000 built-in levels (generated) |
| `data/dict.js` | accepted words for extra words (generated) |
| `tools/` | scripts that generate `data/`, word blocklists |
| `PLAN.md` | research notes and the build plan |

## Regenerating the levels

```sh
pip download hazm wordfreq --no-deps -d wheels && pip install msgpack
# unzip both wheels, then:
python3 tools/extract_words.py hazm/data/words.dat wordfreq/data/small_fa.msgpack.gz wordlists.json
node tools/generate_levels.js wordlists.json
```

Levels 1–300 come from the first five tiers and 301–1000 from the mixed pools after them; the
output is deterministic, so add new levels after the existing ones instead of changing earlier
tiers (saved progress refers to level numbers). If you change the built-in levels, bump `LEVELS_VERSION` in `tools/generate_levels.js` so that
browsers that already played replace their stored copy. Custom levels are kept.

## Word lists (kid-friendly)

- `tools/blocked_words.txt`: never accepted, not on the board and not as an extra word
  (swearing, sexual words, insults, drugs, alcohol).
- `tools/not_answers.txt`: accepted as extra words but never used on the board (names of people,
  places and brands, plus grim words like اعدام).

Every answer word in the 1000 levels was checked by hand. To remove a word, add it to one of the
files and run the generator again: only the levels that used it are rebuilt, and in-progress
saves on those levels drop the words that no longer exist.

## Credits

- Word data: [hazm](https://github.com/roshan-research/hazm) (MIT) and
  [wordfreq](https://github.com/rspeer/wordfreq) (data CC-BY-SA 4.0).
- Font: [Vazirmatn](https://github.com/rastikerdar/vazirmatn) (SIL OFL 1.1, see `fonts/OFL.txt`).
- Game idea: Amirza. This is an unofficial fan project and is not affiliated with it.
