import torch
from transformers import T5Tokenizer, T5ForConditionalGeneration

class GramaAIServer:
    def __init__(self, model_path: str):
        self.tokenizer = T5Tokenizer.from_pretrained(model_path)
        self.model = T5ForConditionalGeneration.from_pretrained(model_path)
        self.model.eval()

    def correct(self, sentence: str) -> str:
        input_text = "correct: " + sentence
        inputs = self.tokenizer(input_text, return_tensors="pt")

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_length=64,
                num_beams=5
            )

        return self.tokenizer.decode(outputs[0], skip_special_tokens=True)
