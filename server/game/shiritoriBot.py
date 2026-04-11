import random
from utils.loader import index


# chuyển chữ nhỏ -> chữ thường
SMALL_KANA = {
    "ゃ": "や",
    "ゅ": "ゆ",
    "ょ": "よ"
}


def get_last_char(word):

    last = word[-1]

    # xử lý kéo dài ー
    if last == "ー" and len(word) > 1:
        last = word[-2]

    # chuyển chữ nhỏ
    if last in SMALL_KANA:
        last = SMALL_KANA[last]

    return last


def get_valid_words(char, used_words):

    if char not in index:
        return []

    valid = []

    for word in index[char]:

        if word in used_words:
            continue

        # thua nếu kết thúc ん
        if word.endswith("ん"):
            continue

        # bỏ từ kết thúc bằng chữ nhỏ
        if word[-1] in ["ゃ", "ゅ", "ょ"]:
            continue

        valid.append(word)

    return valid


def choose_easy(words):

    if not words:
        return None

    return random.choice(words)


def choose_hard(words):

    if not words:
        return None

    best_word = None
    best_score = float("inf")

    for word in words:

        last_char = get_last_char(word)

        next_count = len(index.get(last_char, []))

        if next_count < best_score:
            best_score = next_count
            best_word = word

    return best_word


def shiritoriBot(last_word, used_words, difficulty="easy"):

    last_char = get_last_char(last_word)

    candidates = get_valid_words(last_char, used_words)

    if not candidates:
        return None

    if difficulty == "hard":
        return choose_hard(candidates)

    return choose_easy(candidates)