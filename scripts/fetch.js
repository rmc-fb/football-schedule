const fs = require('fs');

async function main() {
  const apiKey = process.env.RAPIDAPI_KEY;
  // このAPIの正しいURL（RapidAPIのページで確認できます）
  // ページ内の「Endpoints」タブにある情報を参考にしてください
  const url = 'https://free-api-live-football-data.p.rapidapi.com/football-live-scores'; // 仮のURLです、違ったら教えてください

  const headers = {
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com'
  };

  const res = await fetch(url, { headers });
  const json = await res.json();

  // ログに全データを出す（これでデータの構造が分かる！）
  console.log("--- API DATA STRUCTURE ---");
  console.log(JSON.stringify(json, null, 2));
}

main().catch(console.error);
