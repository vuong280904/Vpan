# import os
# import torch
# import librosa
# import pickle
# from shadowModel import ShadowNet
# from transformers import AutoTokenizer, Wav2Vec2Processor

# DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
# SAMPLE_RATE = 16000

# # Processor & tokenizer
# wav2vec_proc = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base-960h")
# tokenizer = AutoTokenizer.from_pretrained("cl-tohoku/bert-base-japanese")

# def load_model(model_path, label_path):
#     with open(label_path, "rb") as f:
#         mlb = pickle.load(f)
#     model = ShadowNet(n_error_classes=len(mlb.classes_))
#     model.load_state_dict(torch.load(model_path, map_location=DEVICE))
#     model.to(DEVICE)
#     model.eval()
#     return model, mlb

# def load_audio(audio_path):
#     wav, _ = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)
#     return wav.astype("float32")

# def predict(model, mlb, audio_path, text, threshold=0.5):
#     model.eval()
#     wav = load_audio(audio_path)
#     audio_inputs = wav2vec_proc([wav], sampling_rate=SAMPLE_RATE, return_tensors="pt", padding=True)
#     for k in audio_inputs:
#         audio_inputs[k] = audio_inputs[k].to(DEVICE)

#     text_inputs = tokenizer([text], return_tensors="pt", truncation=True, padding=True, max_length=128)
#     for k in text_inputs:
#         text_inputs[k] = text_inputs[k].to(DEVICE)

#     with torch.no_grad():
#         score, err_logits = model(audio_inputs, text_inputs)
#         score = float(score.cpu().item() * 100.0)
#         probs = torch.sigmoid(err_logits).cpu().numpy()[0]
#         preds = (probs > threshold).astype(int).reshape(1, -1)
#         labels = mlb.inverse_transform(preds)[0]

#     return score, list(labels), probs

# if __name__ == "__main__":
#     model_file = "C:/Users/vuong/OneDrive/Desktop/Vpan/Vpan/server/modelAI/shadow_model.pt"
#     label_file = "C:/Users/vuong/OneDrive/Desktop/Vpan/Vpan/server/modelAI/error_labels.pkl"
#     test_audio = "C:/Users/vuong/OneDrive/Desktop/Vpan/Vpan/server/wav/test.wav"
#     test_text = "上衣下の乾酪化病巣から、結核菌と結核菌抗原が、膜下腔へと放出されると、髄膜炎が生じる。"

#     if not os.path.exists(model_file) or not os.path.exists(label_file) or not os.path.exists(test_audio):
#         print("⚠ Missing model, label, or test audio file.")
#         exit()

#     model, mlb = load_model(model_file, label_file)
#     score, errors, probs = predict(model, mlb, test_audio, test_text)
#     print("Score:", score)
#     print("Errors:", errors)

# import os

# SAVE_PATH = "./japanese_error_correction_model"

# print("Model tồn tại:", os.path.exists(SAVE_PATH))
# if os.path.exists(SAVE_PATH):
#     print(os.listdir(SAVE_PATH))
# from transformers import MT5ForConditionalGeneration, MT5Tokenizer



# checkpoint = "D:/Vpan/server/modelAI/model_output/checkpoint-229"
# save_path = "./japanese_error_correction_model"

# model = MT5ForConditionalGeneration.from_pretrained(checkpoint)
# tokenizer = MT5Tokenizer.from_pretrained(checkpoint)

# model.save_pretrained(save_path)
# tokenizer.save_pretrained(save_path)

# print("✅ Đã xuất model AI ra:", save_path)


import torch
from transformers import T5Tokenizer, T5ForConditionalGeneration

MODEL_PATH = "./grammar_corrector1"

tokenizer = T5Tokenizer.from_pretrained(MODEL_PATH)
model = T5ForConditionalGeneration.from_pretrained(MODEL_PATH)
model.eval()

def correct_sentence(sentence: str):
    input_text = "correct: " + sentence
    inputs = tokenizer(
        input_text,
        return_tensors="pt"
    )

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_length=64,
            num_beams=5
        )

    return tokenizer.decode(outputs[0], skip_special_tokens=True)

# TEST
while True:
    s = input("Nhập câu tiếng Nhật (q để thoát): ")
    if s.lower() == "q":
        break
    print("➡️ Sửa:", correct_sentence(s))
