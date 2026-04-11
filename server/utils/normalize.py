import re
from utils.loader import kanji_index

# Regex kiểm tra hiragana
HIRAGANA_PATTERN = re.compile(r'^[ぁ-んー]+$')

# map chữ nhỏ → chữ lớn
SMALL_KANA = {
    "ぁ": "あ",
    "ぃ": "い",
    "ぅ": "う",
    "ぇ": "え",
    "ぉ": "お",
    "ゃ": "や",
    "ゅ": "ゆ",
    "ょ": "よ"
}


# Half-width katakana → full-width
def normalize_halfwidth(text):

    result = ""

    for ch in text:
        code = ord(ch)

        # half-width katakana
        if 0xFF66 <= code <= 0xFF9D:
            result += chr(code - 0xFEC0)
        else:
            result += ch

    return result


# Katakana → Hiragana
def katakana_to_hiragana(text):

    result = ""

    for ch in text:
        code = ord(ch)

        # katakana range
        if 0x30A1 <= code <= 0x30F6:
            result += chr(code - 0x60)
        else:
            result += ch

    return result


# Kanji → Hiragana using dictionary index
def kanji_to_hiragana(word):

    if word in kanji_index:
        return kanji_index[word]

    return word


# chuẩn hóa chữ nhỏ
def normalize_small_kana(word):

    result = ""

    for ch in word:

        if ch in SMALL_KANA:
            result += SMALL_KANA[ch]
        else:
            result += ch

    return result


# bỏ dấu kéo dài ー ở cuối
def normalize_long_vowel(word):

    if word.endswith("ー") and len(word) > 1:
        return word[:-1]

    return word


# Normalize toàn bộ word
def normalize_word(word):

    word = word.strip()

    # 1 half-width → full-width
    word = normalize_halfwidth(word)

    # 2 katakana → hiragana
    word = katakana_to_hiragana(word)

    # 3 kanji → hiragana
    word = kanji_to_hiragana(word)

    # 4 chuẩn hóa chữ nhỏ
    word = normalize_small_kana(word)

    # 5 xử lý dấu kéo dài
    word = normalize_long_vowel(word)

    return word


# kiểm tra word có phải hiragana không
def is_hiragana(word):

    return bool(HIRAGANA_PATTERN.match(word))