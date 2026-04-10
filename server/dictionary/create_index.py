import json

# load dictionary
with open("dictionary.json", "r", encoding="utf-8") as f:
    dictionary = json.load(f)

index = {}

for entry in dictionary:

    word = entry["word"]

    first_char = word[0]

    if first_char not in index:
        index[first_char] = []

    index[first_char].append(word)


with open("index.json", "w", encoding="utf-8") as f:
    json.dump(index, f, ensure_ascii=False, indent=2)

print("index.json created")