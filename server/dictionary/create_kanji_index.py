import json

with open("dictionary.json", encoding="utf-8") as f:
    dictionary = json.load(f)

kanji_index = {}

for entry in dictionary:

    kanji = entry.get("kanji")
    word = entry.get("word")

    if not kanji:
        continue

    kanji_list = kanji.split(";")

    for k in kanji_list:

        k = k.strip()

        if k:
            kanji_index[k] = word


with open("kanji_index.json", "w", encoding="utf-8") as f:
    json.dump(kanji_index, f, ensure_ascii=False, indent=2)

print("kanji_index.json created:", len(kanji_index))