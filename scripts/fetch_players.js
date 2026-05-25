// scripts/fetch_players.js
// RapidAPI (free-api-live-football-data) からチームスカッドを取得し
// 日本人選手マップを data/players.json に保存（月1実行想定）
// 実行: RAPIDAPI_KEY=xxx node scripts/fetch_players.js

'use strict';
const fs = require('fs');

const RAPID_KEY  = process.env.RAPIDAPI_KEY;
const RAPID_HOST = 'free-api-live-football-data.p.rapidapi.com';
const BASE_URL   = `https://${RAPID_HOST}`;

if (!RAPID_KEY) {
  console.error('❌ 環境変数 RAPIDAPI_KEY が未設定');
  process.exit(1);
}

// ────────────────────────────────────────────────
// スカッド取得対象チーム
// id : RapidAPI の teamid（check_leagues.js で確認したものを設定）
// name: players.json のキー（fetch_matches.js の home/away と一致させる）
// ────────────────────────────────────────────────
// ※ teamid は RapidAPI の /football-get-team-squad?teamid=xxx で取得可能
// 　 下記は主要チームの例。check_leagues.js の結果を見て随時追加してください。
const TEAMS = [
  // ── プレミアリーグ ──
  { id: 33,  name: 'Manchester United' },
  { id: 40,  name: 'Liverpool' },
  { id: 42,  name: 'Arsenal' },
  { id: 49,  name: 'Chelsea' },
  { id: 50,  name: 'Manchester City' },
  { id: 47,  name: 'Tottenham' },
  { id: 34,  name: 'Newcastle' },
  { id: 66,  name: 'Aston Villa' },
  { id: 55,  name: 'Brentford' },
  { id: 36,  name: 'Fulham' },
  { id: 62,  name: 'Sheffield Utd' },
  { id: 39,  name: 'Wolves' },
  { id: 65,  name: 'Nottm Forest' },
  { id: 35,  name: 'Bournemouth' },
  { id: 52,  name: 'Crystal Palace' },
  { id: 45,  name: 'Everton' },
  { id: 46,  name: 'Leicester' },
  { id: 57,  name: 'Ipswich' },
  { id: 41,  name: 'Southampton' },
  { id: 38,  name: 'West Ham' },
  { id: 72,  name: 'Brighton' },
  // ── ラ・リーガ ──
  { id: 541, name: 'Real Madrid' },
  { id: 529, name: 'Barcelona' },
  { id: 530, name: 'Atletico Madrid' },
  { id: 548, name: 'Real Sociedad' },
  { id: 533, name: 'Villarreal' },
  { id: 536, name: 'Sevilla' },
  { id: 532, name: 'Valencia' },
  { id: 543, name: 'Real Betis' },
  { id: 727, name: 'Osasuna' },
  { id: 798, name: 'Girona' },
  { id: 531, name: 'Athletic Club' },
  { id: 538, name: 'Celta Vigo' },
  { id: 542, name: 'Alaves' },
  { id: 545, name: 'Getafe' },
  { id: 546, name: 'Espanyol' },
  { id: 723, name: 'Mallorca' },
  { id: 724, name: 'Las Palmas' },
  { id: 720, name: 'Leganes' },
  { id: 728, name: 'Valladolid' },
  // ── ブンデスリーガ ──
  { id: 157, name: 'Bayern München' },
  { id: 165, name: 'Dortmund' },
  { id: 173, name: 'Leipzig' },
  { id: 168, name: 'Leverkusen' },
  { id: 172, name: 'Stuttgart' },
  { id: 169, name: 'Frankfurt' },
  { id: 160, name: 'Freiburg' },
  { id: 161, name: 'Wolfsburg' },
  { id: 167, name: 'Hoffenheim' },
  { id: 164, name: 'Mainz' },
  { id: 170, name: 'Monchengladbach' },
  { id: 163, name: 'Union Berlin' },
  { id: 162, name: 'Werder Bremen' },
  { id: 166, name: 'Augsburg' },
  { id: 176, name: 'Bochum' },
  { id: 174, name: 'Heidenheim' },
  { id: 192, name: 'Kiel' },
  // ── セリエA ──
  { id: 505, name: 'Inter' },
  { id: 489, name: 'Milan' },
  { id: 496, name: 'Juventus' },
  { id: 492, name: 'Napoli' },
  { id: 497, name: 'Roma' },
  { id: 487, name: 'Lazio' },
  { id: 499, name: 'Atalanta' },
  { id: 502, name: 'Fiorentina' },
  { id: 494, name: 'Udinese' },
  { id: 503, name: 'Torino' },
  { id: 488, name: 'Cagliari' },
  { id: 500, name: 'Parma' },
  { id: 517, name: 'Monza' },
  { id: 500, name: 'Bologna' },
  { id: 511, name: 'Empoli' },
  { id: 495, name: 'Genoa' },
  { id: 504, name: 'Verona' },
  { id: 490, name: 'Lecce' },
  { id: 519, name: 'Venezia' },
  { id: 506, name: 'Como' },
  // ── リーグ・アン ──
  { id: 85,  name: 'PSG' },
  { id: 91,  name: 'Marseille' },
  { id: 80,  name: 'Lyon' },
  { id: 91,  name: 'Monaco' },
  { id: 116, name: 'Lens' },
  { id: 79,  name: 'Lille' },
  { id: 84,  name: 'Nice' },
  { id: 95,  name: 'Strasbourg' },
  { id: 94,  name: 'Rennes' },
  { id: 83,  name: 'Nantes' },
  { id: 96,  name: 'Toulouse' },
  { id: 86,  name: 'Montpellier' },
  { id: 115, name: 'Brest' },
  { id: 113, name: 'Le Havre' },
  { id: 97,  name: 'Saint-Etienne' },
  // ── エールディヴィジ ──
  { id: 197, name: 'Feyenoord' },
  { id: 194, name: 'Ajax' },
  { id: 196, name: 'PSV Eindhoven' },
  // ── スコティッシュプレミア ──
  { id: 232, name: 'Celtic' },
  { id: 240, name: 'Rangers' },
  // ── ベルギー ──
  { id: 258, name: 'Club Brugge' },
  { id: 260, name: 'Anderlecht' },
  // ── プリメイラリーガ ──
  { id: 211, name: 'Benfica' },
  { id: 228, name: 'Sporting CP' },
  { id: 212, name: 'Porto' },
  { id: 217, name: 'Braga' },
  // ── サウジPL ──
  { id: 2939, name: 'Al Hilal' },
  { id: 2937, name: 'Al Nassr' },
  { id: 2936, name: 'Al Ittihad' },
  { id: 2938, name: 'Al Ahli' },
  // ── MLS ──
  { id: 1599, name: 'LA Galaxy' },
  { id: 1602, name: 'Inter Miami' },
  { id: 1600, name: 'LAFC' },
];

// ────────────────────────────────────────────────
// ユーティリティ
// ────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function rapidFetch(path, retries = 3) {
  const url = `${BASE_URL}${path}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'x-rapidapi-key':  RAPID_KEY,
          'x-rapidapi-host': RAPID_HOST,
        },
      });
      if (res.status === 429) {
        const wait = attempt * 20000;
        console.warn(`  ⏳ 429 Too Many Requests. ${wait/1000}秒待機 (${attempt}/${retries})...`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        console.warn(`  ⚠️ HTTP ${res.status}: ${url}`);
        return null;
      }
      return res.json();
    } catch (e) {
      console.warn(`  ⚠️ fetch error (${attempt}/${retries}): ${e.message}`);
      if (attempt < retries) await sleep(5000);
    }
  }
  return null;
}

// ────────────────────────────────────────────────
// 1チームのスカッドから日本人選手を抽出
// ────────────────────────────────────────────────
async function fetchJapanesePlayers(team) {
  // エンドポイントを試す（APIにより異なる場合あり）
  const data = await rapidFetch(`/football-get-team-squad?teamid=${team.id}`);
  if (!data) return [];

  // レスポンス形式に合わせてパース
  const players = data?.response?.players
    ?? data?.response?.squad
    ?? data?.players
    ?? [];

  const japanese = players
    .filter(p => {
      const nat = p.nationality || p.nation || '';
      return nat === 'Japan' || nat === 'Japanese' || nat === 'JP';
    })
    .map(p => p.name || p.fullName || p.shortName || '');

  return japanese.filter(Boolean);
}

// ────────────────────────────────────────────────
// メイン
// ────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync('data')) fs.mkdirSync('data');

  console.log(`\n👥 日本人選手データ取得開始 (${TEAMS.length}チーム)...\n`);

  const playerMap = {};
  let foundCount = 0;

  for (let i = 0; i < TEAMS.length; i++) {
    const team = TEAMS[i];
    process.stdout.write(`[${String(i+1).padStart(3)}/${TEAMS.length}] ${team.name.padEnd(25)} `);

    const japanese = await fetchJapanesePlayers(team);

    if (japanese.length > 0) {
      playerMap[team.name] = japanese;
      foundCount += japanese.length;
      console.log(`✅ ${japanese.join(', ')}`);
    } else {
      console.log('－');
    }

    // API負荷軽減（月1なので余裕を持って待機）
    if (i < TEAMS.length - 1) await sleep(1200);
  }

  const now    = new Date();
  const jstStr = new Date(now.getTime() + 9*60*60*1000)
    .toISOString().replace('T', ' ').slice(0, 16);

  const output = {
    updatedAt: jstStr,
    players:   playerMap,
  };
  fs.writeFileSync('data/players.json', JSON.stringify(output, null, 2));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 保存完了: ${Object.keys(playerMap).length}チームに日本人選手`);
  console.log(`   合計: ${foundCount}人`);
  Object.entries(playerMap).forEach(([team, players]) => {
    console.log(`   ${team}: ${players.join(', ')}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(err => { console.error(err); process.exit(1); });
