from utils.normalize import normalize_word

def check_word(word, last_char, used_words):

    word = normalize_word(word)

    if word in used_words:
        return False

    if last_char and word[0] != last_char:
        return False

    if word.endswith("ん"):
        return False

    return True