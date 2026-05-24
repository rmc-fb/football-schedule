const fs = require('fs');

async function main() {
  // ここで RAPIDAPI_KEY を確実に取得する
  const apiKey = process.env.RAPIDAPI_KEY;
  
  if (!apiKey) {
    console.error("エラー: RAPIDAPI_KEY が取得できませんでした。GitHub Secretsの設定を確認してください。");
    process.exit(1);
  }

  const url = 'https://free-api-live-football-data.p.rapidapi.com/football-live-scores';
  const headers = {
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com'
  };

  console.log("APIへリクエスト送信中...");
  const res = await fetch(url, { headers });
  const data = await res.json();

  if (data.message && data.message.includes("not subscribed")) {
    console.error("エラー: まだRapidAPIでAPIの購読(Subscribe)が完了していません。");
    process.exit(1);
  }

  // 取得データを保存
  if (!fs.existsSync('data')) fs.mkdirSync('data');
  fs.writeFileSync('data/matches.json', JSON.stringify(data, null, 2));
  console.log("data/matches.json を更新しました。");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
