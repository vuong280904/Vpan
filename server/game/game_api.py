from flask import Flask, request, jsonify
from shiritoriBot import shiritoriBot
from utils.normalize import normalize_word
from utils.loader import index

app = Flask(__name__)

used_words = []

@app.route("/play", methods=["POST"])
def play():

    data = request.json
    user_word = normalize_word(data.get("word"))

    if user_word[0] not in index:
        return jsonify({
            "valid": False,
            "message": "Word not in dictionary"
        })

    used_words.append(user_word)

    bot_word = shiritoriBot(user_word, used_words, "hard")

    if bot_word:
        used_words.append(bot_word)

    return jsonify({
        "valid": True,
        "bot_word": bot_word
    })


if __name__ == "__main__":
    app.run(port=6000)