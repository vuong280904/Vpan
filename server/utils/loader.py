import json

# load dictionary
with open("dictionary/dictionary.json", encoding="utf-8") as f:
    dictionary = json.load(f)

# load index (quan trọng cho AI)
with open("dictionary/index.json", encoding="utf-8") as f:
    index = json.load(f)

# load kanji index (nếu có)
try:
    with open("dictionary/kanji_index.json", encoding="utf-8") as f:
        kanji_index = json.load(f)
except:
    kanji_index = {}