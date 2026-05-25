import gdown
import os

# dataフォルダがなければ作成
os.makedirs("data", exist_ok=True)

# Google DriveのファイルID（あなたのリンクから取得）
file_id = "https://drive.google.com/file/d/11prci9-juzb3SYdtnlzRrPQnFYFXQsh3/view?usp=drive_link"
output = "data/league_check_result.csv"

# ダウンロード
url = f"https://drive.google.com/uc?id={file_id}"
gdown.download(url, output, quiet=False)
print(f"✓ {output} をダウンロードしました")
