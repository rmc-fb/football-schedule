const fs = require('fs');

async function main() {
  const apiKey = process.env.RAPIDAPI_KEY;
  
  // 今度こそ確実な、一番スタンダードなURLにしてみるで
  const url = 'https://free-api-live-football-data.p.rapidapi.com/football-live-scores';

  const headers = {
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com'
  };

  console.log("リクエスト送信中...");
  const res = await fetch(url, { headers });
  const data = await res.json();

  // ファイルに保存
  if (!fs.existsSync('data')) fs.mkdirSync('data');
  fs.writeFileSync('data/matches.json', JSON.stringify(data, null, 2));
  console.log("保存完了！");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
