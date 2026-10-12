# کلمچین — Plan

A web version of the Persian word game **Amirza (آمیرزا)**, made for friends.
It is a plain static site (HTML/CSS/JS, no build step) that also works when opened from disk.

## 1. What Amirza does (research summary)

- **Board:** a crossword-style table of empty cells near the top of the screen. Every cell
  belongs to one or more target words. Horizontal words read right to left.
- **Letter wheel:** a circle of letters at the bottom of the screen. The player drags a finger
  across the letters to build a word. A line follows the finger and the word being built is
  shown above the wheel.
- **Words:** if the word is in the table, its cells fill in. If it is a real Persian word
  but not in the table, it counts as an **extra word (کلمه اضافه)**. Enough extra words pay
  out coins. Words that were already found flash in the table.
- **Coins (سکه):** finishing a level pays coins. Hints cost coins.
- **Hints:**
  - reveal one random letter
  - reveal the cell the player picks (more expensive)
- **Shuffle:** rearranges the wheel letters (free).
- **Levels:** handmade, the same for everybody, grouped into chapters with their own
  background and colour. Early levels have 3 letters and 2–3 words; later ones go up to
  7 letters and many words.
- **Look:** warm Persian visual theme, white rounded cells, filled cells in the chapter
  colour, a light translucent wheel, round icon buttons beside the wheel, coin counter in
  the top bar.

## 2. Decisions for کلمچین

| Topic | Decision |
|---|---|
| Tech | Vanilla JS with classic `<script>` tags (works from `file://`), CSS, the bundled Vazirmatn font |
| Storage | `localStorage`: all levels (seeded on first run), current level, coins, progress inside a level, extra words |
| Words | `hazm` lexicon (MIT) + `wordfreq` Persian frequencies (CC-BY-SA 4.0) |
| Levels | made by `tools/` scripts: pick a common base word, find its common sub-words, lay them out as a crossword |
| Animations | none apart from simple CSS feedback |
| Extra | small level manager page: add your own level, export/import levels as JSON |

## 3. Steps

1. Build word lists from hazm and wordfreq, with filtering and a blocklist (`tools/extract_words.py`).
2. Write the crossword layout engine (`js/layout.js`), shared by the browser and Node.
3. Generate about 300 levels in difficulty tiers and the bonus-word dictionary (`tools/generate_levels.js`).
4. Storage layer: seed and version the levels, save progress (`js/storage.js`).
5. Game screen: top bar, board, wheel with drag input, word preview, hint, shuffle and extra-words buttons.
6. Game rules: matching words, extra words, coin rewards, finishing a level and a chapter.
7. Home screen with a play button, chapter and level map, and settings (reset).
8. Level manager page (custom levels, import/export).
9. Test in headless Chromium (Playwright), fix problems, check the mobile layout.
10. README with how to run and how to host (GitHub Pages).
