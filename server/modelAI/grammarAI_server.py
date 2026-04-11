# from fastapi import FastAPI
# from pydantic import BaseModel
# from grammar_engine import GramaAIServer

# app = FastAPI()
# ai = GramaAIServer("./grammar_corrector1")

# class GrammarRequest(BaseModel):
#     sentence: str

# @app.get("/health")
# def health():
#     return {"status": "ok"}

# @app.post("/correct")
# def correct(req: GrammarRequest):
#     corrected = ai.correct(req.sentence)
#     return {
#         "corrected": corrected
#     }
import os
from fastapi import FastAPI
from grammar_engine import GramaAIServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "grammar_corrector1")

print("Grammar model path:", MODEL_PATH)

app = FastAPI()

ai = GramaAIServer(MODEL_PATH)
