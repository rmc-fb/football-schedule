const fs = require('fs');

async function main() {
  const apiKey = process.env.RAPIDAPI_KEY;
  // 今回のAPIのURL（RapidAPIの画面で確認したもの）
  const url = 'https://free-api-live-football-data.p.rapidapi.com/football-live-scores'; 

  const headers = {
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com'
  };

  const res = await fetch(url, { headers });
  const data = await res.json();

  // ★ここでAPIからの返答をすべてログに出力させます
  console.log("--- API FULL RESPONSE ---");
  console.log(JSON.stringify(data, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
