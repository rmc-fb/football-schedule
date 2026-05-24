const fs = require('fs');
 
const apiKey = process.env.DAIHYO;
const HOST = 'v3.football.api-sports.io';
const BASE = `https://${HOST}`;
 
// ── 欧州クラブリーグ ──
const LEAGUES = [
  { id: 39,  key: 'EPL',              lClass: 'l-epl'    },
  { id: 140, key: 'LaLiga',           lClass: 'l-laliga' },
  { id: 78,  key: 'Bundesliga',       lClass: 'l-bund'   },
  { id: 135, key: 'Serie A',          lClass: 'l-serie'  },
  { id: 61,  key: 'Ligue 1',          lClass: 'l-ligue'  },
  { id: 2,   key: 'Champions League', lClass: 'l-champ'  },
  { id: 3,   key: 'Europa League',    lClass: 'l-uel'    },
];
 
// ── 代表戦リーグ（国際大会） ──
// api-football.com での代表戦リーグID
const NATIONAL_LEAGUES = [
  { id: 4,   key: 'Euro Qual',        label: 'EURO予選',    lClass: 'l-champ' },
  { id: 5,   key: 'UEFA Nations',     label: 'UNL',         lClass: 'l-uel'   },
  { id: 6,   key: 'World Cup Qual',   label: 'W杯予選',     lClass: 'l-champ' },
  { id: 1,   key: 'World Cup',        label: 'W杯',         lClass: 'l-champ' },
  { id: 960, key: 'AFC Asian Cup',    label: 'アジア杯',    lClass: 'l-champ' },
  { id: 30,  key: 'AFC Qual',         label: 'アジア予選',  lClass: 'l-champ' },
  { id: 10,  key: 'Friendlies',       label: '国際親善',    lClass: 'l-ligap' },
];
 
// ── 日本人選手 ──
const JAPANESE_PLAYERS = {
  "Brighton":      ["三笘薫"],
  "Liverpool":     ["遠藤航"],
  "Real Sociedad": ["久保建英"],
  "Celtic":        ["前田大然", "古橋亨梧"],
  "Feyenoord":     ["上田綺世"],
  "Strasbourg":    ["中村敬斗"],
  "Stuttgart":     ["伊藤洋輝"],
  "Bochum":        ["田中碧"],
  "Mainz":         ["相馬勇紀"],
};
 
// ── api-football.com 共通フェッチ ──
async function apiFetch(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'x-apisports-key': apiKey,
    }
  });
  if (!res.ok) {
    console.warn(`HTTP ${res.status}: ${url}`);
    return null;
  }
  return res.json();
}
 
// ── シーズン取得（現在年） ──
function currentSeason() {
  const now = new Date();
  // サッカーシーズンは8月開幕が多いので、7月以前は前年シーズン
  return now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear();
}
 
// ── クラブリーグの試合取得 ──
async function fetchLeague(league) {
  const season = currentSeason();
  // 今後7日分を取得
  const from = toDateStr(new Date());
  const to   = toDateStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const data = await apiFetch(`/fixtures?league=${league.id}&season=${season}&from=${from}&to=${to}&timezone=UTC`);
  if (!data) return [];
  return data.response || [];
}
 
// ── 代表戦の試合取得 ──
async function fetchNational(league) {
  const season = new Date().getFullYear(); // 代表戦は年単位
  const from = toDateStr(new Date());
  const to   = toDateStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30日先まで
  const data = await apiFetch(`/fixtures?league=${league.id}&season=${season}&from=${from}&to=${to}&timezone=UTC`);
  if (!data) return [];
  return data.response || [];
}
 
function toDateStr(d) {
  return d.toISOString().split('T')[0];
}
 
// ── api-football レスポンス → 共通フォーマット変換 ──
function parseFixture(f, league, isNational = false) {
  const kickoffUTC = f.fixture?.date;
  const home = f.teams?.home?.name || '';
  const away = f.teams?.away?.name || '';
  if (!kickoffUTC || !home || !away) return null;
 
  const japanese = isNational ? [] : [
    ...(JAPANESE_PLAYERS[home] || []),
    ...(JAPANESE_PLAYERS[away] || []),
  ];
 
  return {
    kickoffUTC,
    home,
    away,
    league: league.key,
    lClass: league.lClass,
    japanese,
    national: isNational,
    // 代表戦はラベルを上書き
    ...(isNational && { leagueLabel: league.label }),
  };
}
 
async function main() {
  if (!apiKey) {
    console.error('❌ 環境変数 DAIHYO が設定されていません');
    process.exit(1);
  }
 
  const now = new Date();
  const allMatches = [];
 
  // ── クラブリーグ取得 ──
  for (const league of LEAGUES) {
    console.log(`取得中: ${league.key}`);
    const fixtures = await fetchLeague(league);
    console.log(`  → ${fixtures.length}件取得`);
    for (const f of fixtures) {
      const m = parseFixture(f, league, false);
      if (m) allMatches.push(m);
    }
    await sleep(1200); // レート制限対策（Free: 10req/min）
  }
 
  // ── 代表戦取得 ──
  for (const league of NATIONAL_LEAGUES) {
    console.log(`代表戦取得中: ${league.label}`);
    const fixtures = await fetchNational(league);
    console.log(`  → ${fixtures.length}件取得`);
    for (const f of fixtures) {
      const m = parseFixture(f, league, true);
      if (m) allMatches.push(m);
    }
    await sleep(1200);
  }
 
  // 重複除去（同じ試合が複数リーグIDに引っかかる場合）
  const seen = new Set();
  const unique = allMatches.filter(m => {
    const key = `${m.kickoffUTC}|${m.home}|${m.away}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
 
  unique.sort((a, b) => a.kickoffUTC.localeCompare(b.kickoffUTC));
 
  const jstStr = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString().replace('T', ' ').slice(0, 16);
 
  if (!fs.existsSync('data')) fs.mkdirSync('data');
  fs.writeFileSync('data/matches.json', JSON.stringify({ updatedAt: jstStr, matches: unique }, null, 2));
  console.log(`✅ 保存完了: ${unique.length}試合（代表戦含む）`);
}
 
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
 
main().catch(err => { console.error(err); process.exit(1); });
