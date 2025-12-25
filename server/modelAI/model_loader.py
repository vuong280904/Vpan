# model_loader.py
import os
import boto3

BUCKET = "vpan-ai-model"

BASE_DIR = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODEL_DIR, "shadow_model.pt")
LABEL_PATH = os.path.join(MODEL_DIR, "error_labels.pkl")

print("AWS_ACCESS_KEY_ID:", os.getenv("AWS_ACCESS_KEY_ID"))
print("AWS_SECRET_ACCESS_KEY:", bool(os.getenv("AWS_SECRET_ACCESS_KEY")))
print("AWS_REGION:", os.getenv("AWS_REGION"))

def download_if_not_exists():
    s3 = boto3.client(
        "s3",
        region_name=os.getenv("AWS_REGION"),  # ✅ ap-southeast-2
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )

    if not os.path.exists(MODEL_PATH):
        print("Downloading shadow_model.pt from S3...")
        s3.download_file(
            BUCKET,
            "shadow_model.pt",   # ✅ đúng key
            MODEL_PATH
        )
        print("shadow_model.pt downloaded")

    if not os.path.exists(LABEL_PATH):
        print("Downloading error_labels.pkl from S3...")
        s3.download_file(
            BUCKET,
            "error_labels.pkl",  # ✅ đúng key
            LABEL_PATH
        )
        print("error_labels.pkl downloaded")

    return MODEL_PATH, LABEL_PATH
