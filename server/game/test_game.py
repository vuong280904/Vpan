import sys
import os

# cho phép import từ folder cha
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from shiritoriBot import shiritoriBot
from utils.normalize import normalize_word
from utils.loader import index

used_words = []

# chữ nhỏ
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


def get_last_char(word):

    if not word:
        return None

    last = word[-1]

    # xử lý kéo dài
    if last == "ー" and len(word) > 1:
        last = word[-2]

    # chuyển chữ nhỏ
    if last in SMALL_KANA:
        last = SMALL_KANA[last]

    return last


def is_valid_word(word, last_char):

    # từ phải >= 2 ký tự
    if len(word) < 2:
        print("❌ Word too short")
        return False

    # đã dùng rồi
    if word in used_words:
        print("❌ Word already used")
        return False

    # kiểm tra chữ đầu
    if last_char and word[0] != last_char:
        print(f"❌ Must start with: {last_char}")
        return False

    # kết thúc bằng ん
    if word.endswith("ん"):
        print("❌ Word ends with ん. You lose.")
        return False

    # kiểm tra dictionary
    if word[0] not in index or word not in index[word[0]]:
        print("❌ Word not in dictionary")
        return False

    return True


print("==== Shiritori Test Game ====")

difficulty = input("Choose difficulty (easy/hard): ").strip().lower()

last_word = None

while True:

    print()

    if last_word:
        print("Start with:", get_last_char(last_word))

    user_input = input("You: ").strip()

    # normalize input
    word = normalize_word(user_input)

    last_char = get_last_char(last_word) if last_word else None

    if not is_valid_word(word, last_char):
        continue

    used_words.append(word)
    last_word = word

    bot_word = shiritoriBot(last_word, used_words, difficulty)

    if not bot_word:
        print("🎉 Bot cannot continue. You win!")
        break

    print("Bot:", bot_word)

    if bot_word.endswith("ん"):
        print("🎉 Bot lost!")
        break

    used_words.append(bot_word)
    last_word = bot_word