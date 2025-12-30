# model_loader.py
import os
import boto3
import traceback

BUCKET = "vpan-ai-model"

BASE_DIR = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODEL_DIR, "shadow_model.pt")
LABEL_PATH = os.path.join(MODEL_DIR, "error_labels.pkl")

def download_if_not_exists():
    # Dùng tiếng Anh để tránh lỗi encoding trên Windows
    print(">>> Starting check and download models from S3...")
    
    access_key = os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    region = os.getenv("AWS_REGION")
    
    print(f"AWS_ACCESS_KEY_ID: {access_key}")
    print(f"AWS_SECRET_ACCESS_KEY: {'***' if secret_key else None}")
    print(f"AWS_REGION: {region}")
    print(f"Bucket: {BUCKET}")
    print(f"Model local path: {MODEL_PATH}")
    print(f"Label local path: {LABEL_PATH}")

    if not access_key or not secret_key or not region:
        raise ValueError("Missing AWS credentials or region in environment variables!")

    s3 = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
    )

    try:
        if not os.path.exists(MODEL_PATH):
            print(f">>> Downloading shadow_model.pt from s3://{BUCKET}/shadow_model.pt ...")
            s3.download_file(BUCKET, "shadow_model.pt", MODEL_PATH)
            print(">>> shadow_model.pt downloaded successfully")
        else:
            print(">>> shadow_model.pt already exists locally")

        if not os.path.exists(LABEL_PATH):
            print(f">>> Downloading error_labels.pkl from s3://{BUCKET}/error_labels.pkl ...")
            s3.download_file(BUCKET, "error_labels.pkl", LABEL_PATH)
            print(">>> error_labels.pkl downloaded successfully")
        else:
            print(">>> error_labels.pkl already exists locally")

    except Exception as e:
        print(">>> ERROR DOWNLOADING FROM S3:")
        print(traceback.format_exc())
        raise

    return MODEL_PATH, LABEL_PATH