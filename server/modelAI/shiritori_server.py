import sys
import os

# thêm path tới folder server
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from fastapi import FastAPI
from pydantic import BaseModel
from game.shiritoriBot import shiritoriBot

app = FastAPI()

used_words = []

class WordInput(BaseModel):
    word: str
    difficulty: str = "easy"

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/play")
def play(data: WordInput):

    user_word = data.word

    used_words.append(user_word)

    bot_word = shiritoriBot(user_word, used_words, data.difficulty)

    if bot_word:
        used_words.append(bot_word)

    return {
        "valid": True,
        "bot_word": bot_word
    }