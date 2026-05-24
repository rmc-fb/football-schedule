const fs = require('fs');

async function main() {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    console.error("API KEY が設定されていません！");
    process.exit(1);
  }

  const url = 'https://free-api-live-football-data.p.rapidapi.com/football-live-scores';
  const headers = {
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com'
  };

  const res = await fetch(url, { headers });
  const data = await res.json();

  // サブスクリプションエラーのチェック
  if (data.message && data.message.includes("not subscribed")) {
    console.error("【重要】まだAPIのサブスクリプションが有効になっていません。RapidAPIのページを確認してください。");
    process.exit(1);
  }

  console.log("--- 取得データ ---");
  console.log(JSON.stringify(data, null, 2));
  
  // 正常に取れたらファイルに保存
  fs.writeFileSync('data/matches.json', JSON.stringify(data, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
