const fs = require('fs');

async function main() {
  const apiKey = process.env.RAPIDAPI_KEY;
  // URLは「RapidAPI」の画面で、使いたいAPIの「Endpoints」にあるものを確認してください
  const url = 'https://free-api-live-football-data.p.rapidapi.com/football-live-scores'; 

  const headers = {
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com'
  };

  console.log("Fetching data from API...");
  
  const res = await fetch(url, { headers });
  const data = await res.json();

  // ★ここにデータの中身をすべてログに出力する
  console.log("--- API FULL RESPONSE START ---");
  console.log(JSON.stringify(data, null, 2));
  console.log("--- API FULL RESPONSE END ---");
}

main().catch(err => {
  console.error("Error occurred:", err);
  process.exit(1);
});
