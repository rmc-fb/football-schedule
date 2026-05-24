const fs = require('fs');

async function main() {
  const apiKey = process.env.RAPIDAPI_KEY;
  const baseUrl = 'https://api-football-v1.p.rapidapi.com/v3';
  
  // 取得したいリーグとシーズン（例: 39はプレミアリーグ）
  const league = 39; 
  const season = 2025;

  const headers = {
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
  };

  console.log("Fetching matches...");
  
  // 1. 試合日程を取得
  const res = await fetch(`${baseUrl}/fixtures?league=${league}&season=${season}`, { headers });
  const json = await res.json();

  // 2. データを整形して保存
  const output = {
    updatedAt: new Date().toLocaleString('ja-JP', {timeZone: 'Asia/Tokyo'}),
    matches: json.response.map(m => ({
      kickoffUTC: m.fixture.date,
      home: m.teams.home.name,
      away: m.teams.away.name,
      league: 'EPL', // サイト側で使っている識別子に合わせる
      lClass: 'l-epl'
    }))
  };

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/matches.json', JSON.stringify(output, null, 2));
  console.log("Data saved to data/matches.json");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
