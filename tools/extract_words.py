"""Build the word lists used by generate_levels.js.

Usage:
    python3 extract_words.py <hazm words.dat> <wordfreq small_fa.msgpack.gz> <out.json>

Sources:
    hazm      (MIT)          https://github.com/roshan-research/hazm  -> hazm/data/words.dat
    wordfreq  (CC-BY-SA 4.0) https://github.com/rspeer/wordfreq       -> wordfreq/data/small_fa.msgpack.gz

Output JSON:
    targets: [[word, rank], ...]  common words allowed inside the crossword
    dict:    [word, ...]          every word accepted (also as an extra word), most common first
"""
import gzip
import json
import re
import sys

import msgpack

LETTERS = 'آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی'
ONLY_LETTERS = re.compile('^[' + LETTERS + ']+$')
MIN_LEN, MAX_LEN = 2, 7
FUNCTION_TAGS = {'P', 'CONJ', 'PRO', 'DET', 'PS', 'POSTP', 'CL', 'INT', 'PR'}

# Rude words that must never show up in a level.
BLOCK = set('''
لاس کیر کس کون کص کوس جنده جاکش کسکش کونی لاشی ممه دیوث پفیوز حرومزاده حرامزاده
گاییدن گایید سکس شاش گوه گه
'''.split())

# Very short function words: fine as extra words, not as crossword answers.
NOT_TARGET = set('''
به در از که با را رو من تو هم تا یک ها ما آن شد می یا بر هر یه چه نه پس ای او کن چی
این است بود شده شما همه کرد خود های اما اون فقط یکی چرا اگه اگر هست گفت نیز چون
باید داره کرده دارد کردن دارم الان باشه خیلی نیست کنید حالا دیگر کردم بوده باشد بدون داشت
'''.split())


def usable(w):
    return ONLY_LETTERS.match(w) and MIN_LEN <= len(w) <= MAX_LEN and w not in BLOCK


def main(words_dat, wordfreq_path, out_path):
    hazm = {}
    for line in open(words_dat, encoding='utf8'):
        parts = line.rstrip('\n').split('\t')
        if len(parts) < 2 or not usable(parts[0]):
            continue
        tags = set(parts[2].split(',')) if len(parts) > 2 else set()
        tags.discard('0')
        freq, old_tags = hazm.get(parts[0], (0, set()))
        hazm[parts[0]] = (max(freq, int(parts[1])), old_tags | tags)

    buckets = msgpack.unpackb(gzip.open(wordfreq_path).read(), raw=False)[1:]
    rank, r = {}, 0
    for bucket in buckets:
        for w in bucket:
            r += 1
            if usable(w) and w not in rank:
                rank[w] = r

    targets = []
    for w, rk in rank.items():
        if w not in hazm or w in NOT_TARGET:
            continue
        tags = hazm[w][1]
        # Untagged entries are mostly colloquial or inflected forms; pronouns are boring answers.
        if not tags or tags <= FUNCTION_TAGS or 'PRO' in tags:
            continue
        targets.append([w, rk])
    targets.sort(key=lambda x: x[1])

    # Accepted words: everything wordfreq knows plus hazm entries that are not ultra-rare.
    accepted = set(rank) | {w for w, (f, _) in hazm.items() if f >= 2000}
    # Most common first, so the level manager can suggest everyday words before rare ones.
    data = {'targets': targets, 'dict': sorted(accepted, key=lambda w: (rank.get(w, 10 ** 9), w))}
    with open(out_path, 'w', encoding='utf8') as f:
        json.dump(data, f, ensure_ascii=False)
    print('targets', len(targets), 'dict', len(accepted))


if __name__ == '__main__':
    main(*sys.argv[1:4])
