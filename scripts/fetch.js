const fs = require('fs');
 
const apiKey = process.env.DAIHYO;
const BASE = 'https://api.football-data.org/v4';
 
// ── Football-Data.org の competition code → サイト内キー・スタイル ──
const COMPETITION_MAP = {
  // 欧州クラブ
  'PL':  { key: 'EPL',              lClass: 'l-epl',    national: false },
  'PD':  { key: 'LaLiga',           lClass: 'l-laliga', national: false },
  'BL1': { key: 'Bundesliga',       lClass: 'l-bund',   national: false },
  'SA':  { key: 'Serie A',          lClass: 'l-serie',  national: false },
  'FL1': { key: 'Ligue 1',          lClass: 'l-ligue',  national: false },
  'PPL': { key: 'Liga Portugal',    lClass: 'l-ligap',  national: false },
  'DED': { key: 'Eredivisie',       lClass: 'l-erediv', national: false },
  'CL':  { key: 'Champions League', lClass: 'l-champ',  national: false },
  'EL':  { key: 'Europa League',    lClass: 'l-uel',    national: false },
  // 代表戦
  'WC':  { key: 'World Cup',        lClass: 'l-champ',  national: true  },
  'EC':  { key: 'Euro',             lClass: 'l-champ',  national: true  },
};
 
// 代表戦として扱う competition code
const NATIONAL_CODES = new Set(['WC', 'EC', 'WCQ', 'ECQ', 'AFCQ', 'AFC', 'INT']);
 
// ── 日本人選手（shortName に合わせる） ──
const JAPANESE_PLAYERS = {
  "Brighton Hove":  ["三笘薫"],
  "Liverpool":      ["遠藤航"],
  "Real Sociedad":  ["久保建英"],
  "Celtic":         ["前田大然", "古橋亨梧"],
  "Feyenoord":      ["上田綺世"],
  "Strasbourg":     ["中村敬斗"],
  "Stuttgart":      ["伊藤洋輝"],
  "Bochum":         ["田中碧"],
  "Mainz":          ["相馬勇紀"],
};
 
async function fetchMatches(dateFrom, dateTo) {
  const url = `${BASE}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
  const res = await fetch(url, {
    headers: { 'X-Auth-Token': apiKey }
  });
  if (!res.ok) {
    console.warn(`HTTP ${res.status}: ${url}`);
    const text = await res.text();
    console.warn(text);
    return [];
  }
  const data = await res.json();
  return data.matches || [];
}
 
function toDateStr(d) {
  return d.toISOString().split('T')[0];
}
 
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
 
async function main() {
  if (!apiKey) {
    console.error('❌ 環境変数 DAIHYO が設定されていません');
    process.exit(1);
  }
 
  const now = new Date();
  // 今日から30日分取得
  const dateFrom = toDateStr(now);
  const dateTo = toDateStr(new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000));
 
  // 10日ずつ3回に分けて取得（APIの10日制限対策）
  let raw = [];
  for (let i = 0; i < 3; i++) {
    const from = toDateStr(new Date(now.getTime() + i * 10 * 24 * 60 * 60 * 1000));
    const to   = toDateStr(new Date(now.getTime() + (i * 10 + 9) * 24 * 60 * 60 * 1000));
    console.log(`取得期間: ${from} 〜 ${to}`);
    const chunk = await fetchMatches(from, to);
    console.log(`  → ${chunk.length}件取得`);
    raw = raw.concat(chunk);
    await sleep(1000);
  }
 
  const allMatches = [];
 
  for (const m of raw) {
    // 終了試合は除外
    if (m.status === 'FINISHED' || m.status === 'CANCELLED' || m.status === 'POSTPONED') continue;
 
    const code  = m.competition?.code || '';
    const comp  = COMPETITION_MAP[code];
 
    // マッピングにないリーグは除外（ブラジルリーグなど不要なら除外）
    if (!comp) continue;
 
    const kickoffUTC = m.utcDate;
    const home = m.homeTeam?.shortName || m.homeTeam?.name || '';
    const away = m.awayTeam?.shortName || m.awayTeam?.name || '';
    if (!home || !away) continue;
 
    const isNational = comp.national || NATIONAL_CODES.has(code);
 
    const japanese = isNational ? [] : [
      ...(JAPANESE_PLAYERS[home] || []),
      ...(JAPANESE_PLAYERS[away] || []),
    ];
 
    allMatches.push({
      kickoffUTC,
      home,
      away,
      league: comp.key,
      lClass: comp.lClass,
      japanese,
      national: isNational,
    });
  }
 
  // 重複除去
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
  console.log(`✅ 保存完了: ${unique.length}試合`);
}
 
main().catch(err => { console.error(err); process.exit(1); });
 
