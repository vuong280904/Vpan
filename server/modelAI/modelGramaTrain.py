

import pandas as pd
from datasets import Dataset
from transformers import (
    T5Tokenizer,
    T5ForConditionalGeneration,
    Trainer,
    TrainingArguments
)
from sklearn.model_selection import train_test_split

# ======================
# CONFIG
# ======================
MODEL_NAME = "google/mt5-small"  # hỗ trợ tiếng Nhật tốt
# DATA_PATH = "D:/Vpan/Vpan/data.txt"
DATA_PATH = "D:/Vpan/server/data.txt"
SAVE_PATH = "./grammar_corrector"
MAX_INPUT_LEN = 64
MAX_OUTPUT_LEN = 64

# ======================
# LOAD DATA
# ======================
# df = pd.read_csv(DATA_PATH)
df = pd.read_csv(
    DATA_PATH,
    engine="python",
    on_bad_lines="skip"
)

# input = câu sai,
# output = câu đúng
df["input_text"] = "correct: " + df["incorrect_text"]
df["target_text"] = df["correct_text"]

train_df, val_df = train_test_split(df, test_size=0.2, random_state=42)

train_ds = Dataset.from_pandas(train_df)
val_ds = Dataset.from_pandas(val_df)

# ======================
# TOKENIZER & MODEL
# ======================
tokenizer = T5Tokenizer.from_pretrained(MODEL_NAME)
model = T5ForConditionalGeneration.from_pretrained(MODEL_NAME)

def preprocess(batch):
    inputs = tokenizer(
        batch["input_text"],
        max_length=MAX_INPUT_LEN,
        truncation=True,
        padding="max_length"
    )
    targets = tokenizer(
        batch["target_text"],
        max_length=MAX_OUTPUT_LEN,
        truncation=True,
        padding="max_length"
    )
    inputs["labels"] = targets["input_ids"]
    return inputs

train_ds = train_ds.map(preprocess, batched=True)
val_ds = val_ds.map(preprocess, batched=True)

# ======================
# TRAINING CONFIG
# ======================
training_args = TrainingArguments(
    output_dir=SAVE_PATH,
    eval_strategy="epoch",
    save_strategy="epoch",
    learning_rate=3e-4,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    num_train_epochs=14,
    weight_decay=0.01,
    logging_dir="./logs",
    logging_steps=10,
    save_total_limit=2,
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    greater_is_better=False
)

# ======================
# TRAIN
# ======================
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_ds,
    eval_dataset=val_ds,
    tokenizer=tokenizer
)

trainer.train()

# ======================
# SAVE MODEL
# ======================
trainer.save_model(SAVE_PATH)
tokenizer.save_pretrained(SAVE_PATH)

print("✅ Model saved to:", SAVE_PATH)
