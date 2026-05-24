const fs = require('fs');

async function main() {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) throw new Error("APIキーが設定されていません");

  // 1. 試合日程を取得 (例: プレミアリーグ league=39, 2025シーズン)
  const resFixtures = await fetch('https://api-football-v1.p.rapidapi.com/v3/fixtures?league=39&season=2025', {
    headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'api-football-v1.p.rapidapi.com' }
  });
  const fixturesData = await resFixtures.json();

  // 2. 選手情報を取得 (例: ブライトンのID=52)
  const resPlayers = await fetch('https://api-football-v1.p.rapidapi.com/v3/players/squads?team=52', {
    headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'api-football-v1.p.rapidapi.com' }
  });
  const playersData = await resPlayers.json();

  // 3. データを加工して matches.json の形式に合わせる処理 (ここは要調整)
  // ここで取得したデータを組み合わせたオブジェクトを作成
  const output = {
    updatedAt: new Date().toLocaleString('ja-JP'),
    matches: fixturesData.response // APIのレスポンス構造に合わせて変更が必要
  };

  // 4. ファイル保存
  fs.writeFileSync('data/matches.json', JSON.stringify(output, null, 2));
}

main().catch(console.error);
