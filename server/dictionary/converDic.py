import json
import gzip
import re

data = []
seen = set()

hiragana = re.compile(r'^[ぁ-んー]+$')

with gzip.open("edict2.gz", "rt", encoding="euc_jp") as f:
    for line in f:

        if "/" not in line:
            continue

        parts = line.split("/")
        word_part = parts[0].strip()

        if "[" in word_part:
            kanji = word_part.split("[")[0].strip()
            kana = word_part.split("[")[1].split("]")[0]
        else:
            kanji = word_part
            kana = word_part

        kana = kana.split(";")[0].strip()
        kanji = kanji.split(";")[0].strip()

        if not hiragana.match(kana):
            continue

        if kana.endswith("ん"):
            continue

        if kana in seen:
            continue

        seen.add(kana)

        meaning = parts[1].strip()

        # clean meaning
        meaning = re.sub(r"\(.*?\)", "", meaning)
        meaning = meaning.strip()

        data.append({
            "word": kana,
            "kanji": kanji,
            "meaning": meaning
        })

        if len(data) >= 15000:
            break


with open("dictionary.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("dictionary.json created:", len(data))