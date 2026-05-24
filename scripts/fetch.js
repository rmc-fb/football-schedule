const fs = require('fs');

async function main() {
  const apiKey = process.env.RAPIDAPI_KEY;
  const url = 'https://free-api-live-football-data.p.rapidapi.com/football-live-scores'; 
  const headers = {
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com'
  };

  console.log("Fetch Start");
  const res = await fetch(url, { headers });
  const text = await res.text(); // JSONではなくテキストとしてまず受け取る
  console.log("--- DATA START ---");
  console.log(text);
  console.log("--- DATA END ---");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
