
import pdfplumber
import os

def extract_text(pdf_path, txt_path):
    print(f"Extracting {pdf_path} to {txt_path}...")
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() + "\n\n"
        
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text)
        print("Done.")
    except Exception as e:
        print(f"Error extracting {pdf_path}: {e}")

base_dir = "/Users/tianyihan/repository/4-BW_image-J/reference"
files = [
    ("中嶋 - 2023 - Image Jを用いた関節可動域測定における検者内再現性の検討.pdf", "nakajima.txt"),
    ("画像解析ソフトImageJ 信頼性の検証.pdf", "imagej_reliability.txt")
]

for pdf_file, txt_file in files:
    extract_text(os.path.join(base_dir, pdf_file), os.path.join(base_dir, txt_file))
