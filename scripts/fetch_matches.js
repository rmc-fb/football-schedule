// scripts/fetch_matches.js
'use strict';
const fs = require('fs');

const RAPID_KEY        = process.env.RAPIDAPI_KEY;
const RAPID_HOST       = 'free-api-live-football-data.p.rapidapi.com';
const BASE_URL         = `https://${RAPID_HOST}`;
const FOOTBALLDATA_KEY = process.env.FOOTBALLDATA_KEY;

if (!RAPID_KEY)        console.warn('⚠️  RAPIDAPI_KEY が未設定。RapidAPI取得はスキップします。');
if (!FOOTBALLDATA_KEY) console.warn('⚠️  FOOTBALLDATA_KEY が未設定。FD取得はスキップします。');

// ────────────────────────────────────────────────
// football-data.org 担当クラブリーグ（メイン）
// ────────────────────────────────────────────────
const FD_CLUB_LEAGUES = [
  { id: 2021, key: 'EPL',              lClass: 'l-epl',    tab: 'europe', gender: 'male' },
  { id: 2014, key: 'LaLiga',           lClass: 'l-laliga', tab: 'europe', gender: 'male' },
  { id: 2002, key: 'Bundesliga',       lClass: 'l-bund',   tab: 'europe', gender: 'male' },
  { id: 2019, key: 'Serie A',          lClass: 'l-serie',  tab: 'europe', gender: 'male' },
  { id: 2015, key: 'Ligue 1',          lClass: 'l-ligue',  tab: 'europe', gender: 'male' },
  { id: 2003, key: 'Eredivisie',       lClass: 'l-erediv', tab: 'europe', gender: 'male' },
  { id: 2017, key: 'Liga Portugal',    lClass: 'l-ligap',  tab: 'europe', gender: 'male' },
  { id: 2016, key: 'Championship',     lClass: 'l-champ2', tab: 'europe', gender: 'male' },
  { id: 2001, key: 'Champions League', lClass: 'l-champ',  tab: 'europe', gender: 'male' },
];

// ────────────────────────────────────────────────
// RapidAPI 担当クラブリーグ（メイン）
// ────────────────────────────────────────────────
const RAPID_LEAGUES = [
  // 欧州
  { id: 40,    key: 'Belgian Pro League',      lClass: 'l-belgique', tab: 'europe', gender: 'male'   },
  { id: 64,    key: 'Scottish Prem',           lClass: 'l-spl',      tab: 'europe', gender: 'male'   },
  { id: 73,    key: 'Europa League',           lClass: 'l-uel',      tab: 'europe', gender: 'male'   },
  { id: 10216, key: 'Conference League',       lClass: 'l-uel',      tab: 'europe', gender: 'male'   },
  { id: 9227,  key: 'WSL',                     lClass: 'l-womens',   tab: 'europe', gender: 'female' },
  { id: 9676,  key: 'Frauen Bundesliga',       lClass: 'l-womens',   tab: 'europe', gender: 'female' },
  { id: 9375,  key: 'Women Champions League',  lClass: 'l-womens',   tab: 'europe', gender: 'female' },
  { id: 9677,  key: 'Première Ligue Féminine', lClass: 'l-womens',   tab: 'europe', gender: 'female' },
  // 中東
  { id: 536,   key: 'Saudi Pro League',        lClass: 'l-middle',   tab: 'middle', gender: 'male'   },
  { id: 538,   key: 'UAE Pro League',          lClass: 'l-middle',   tab: 'middle', gender: 'male'   },
  { id: 535,   key: 'Qatar Stars',             lClass: 'l-middle',   tab: 'middle', gender: 'male'   },
  { id: 525,   key: 'AFC Champions',           lClass: 'l-middle',   tab: 'middle', gender: 'male'   },
  // 北米
  { id: 130,   key: 'MLS',                     lClass: 'l-north',    tab: 'north',  gender: 'male'   },
  { id: 230,   key: 'Liga MX',                 lClass: 'l-north',    tab: 'north',  gender: 'male'   },
  { id: 9134,  key: 'NWSL',                    lClass: 'l-womens',   tab: 'north',  gender: 'female' },
  // ユース代表
  { id: 10369, key: 'U-20 World Cup',   lClass: 'l-youth', tab: 'youth', gender: 'male', national: true, youth: true },
  { id: 306,   key: 'U-17 World Cup',   lClass: 'l-youth', tab: 'youth', gender: 'male', national: true, youth: true },
  { id: 9571,  key: 'U-23 Asian Cup',   lClass: 'l-youth', tab: 'youth', gender: 'male', national: true, youth: true },
  { id: 9841,  key: 'U-20 Asian Cup',   lClass: 'l-youth', tab: 'youth', gender: 'male', national: true, youth: true },
  { id: 288,   key: 'UEFA U21',         lClass: 'l-youth', tab: 'youth', gender: 'male', national: true, youth: true },
];

// ────────────────────────────────────────────────
// football-data.org 代表戦（男子 World Cup のみ）
// ────────────────────────────────────────────────
const FD_NATIONAL = [
  { id: 2000, key: 'World Cup', lClass: 'l-wc', tab: 'national', gender: 'male', national: true },
];

const RAPID_NATIONAL_FALLBACK = {
  'World Cup': { id: 77, lClass: 'l-wc', tab: 'national', gender: 'male', national: true },
};

const RAPID_NATIONAL = [
  { id: 76,    key: 'Women World Cup',        lClass: 'l-wc',    tab: 'national', gender: 'female', national: true },
  { id: 9806,  key: 'Nations League A',       lClass: 'l-champ', tab: 'national', gender: 'male',   national: true },
  { id: 9807,  key: 'Nations League B',       lClass: 'l-champ', tab: 'national', gender: 'male',   national: true },
  { id: 9808,  key: 'Nations League C',       lClass: 'l-champ', tab: 'national', gender: 'male',   national: true },
  { id: 9809,  key: 'Nations League D',       lClass: 'l-champ', tab: 'national', gender: 'male',   national: true },
  { id: 10457, key: 'Nations League W-A',     lClass: 'l-champ', tab: 'national', gender: 'female', national: true },
  { id: 10458, key: 'Nations League W-B',     lClass: 'l-champ', tab: 'national', gender: 'female', national: true },
  { id: 10459, key: 'Nations League W-C',     lClass: 'l-champ', tab: 'national', gender: 'female', national: true },
  { id: 50,    key: 'Euro',                   lClass: 'l-champ', tab: 'national', gender: 'male',   national: true },
  { id: 292,   key: 'Women Euro',             lClass: 'l-champ', tab: 'national', gender: 'female', national: true },
  { id: 290,   key: 'AFC Asian Cup',          lClass: 'l-champ', tab: 'national', gender: 'male',   national: true },
  { id: 10269, key: 'Women Asian Cup',        lClass: 'l-champ', tab: 'national', gender: 'female', national: true },
  { id: 289,   key: 'AFCON',                  lClass: 'l-champ', tab: 'national', gender: 'male',   national: true },
  { id: 10371, key: 'Women AFCON',            lClass: 'l-champ', tab: 'national', gender: 'female', national: true },
];

const FD_CREST_COMPETITIONS = [2021, 2014, 2002, 2019, 2015, 2001, 2003, 2017, 2016];

// ────────────────────────────────────────────────
// ユーティリティ
// ────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function rapidFetch(path, retries = 3) {
  if (!RAPID_KEY) return null;
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
        const wait = attempt * 15000;
        console.warn(`  ⏳ 429 Too Many Requests. ${wait/1000}秒待機 (${attempt}/${retries})...`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) { console.warn(`  ⚠️ HTTP ${res.status}: ${url}`); return null; }
      return res.json();
    } catch (e) {
      console.warn(`  ⚠️ fetch error (${attempt}/${retries}): ${e.message}`);
      if (attempt < retries) await sleep(5000);
    }
  }
  return null;
}

async function fdFetch(path, retries = 3) {
  if (!FOOTBALLDATA_KEY) return null;
  const url = `https://api.football-data.org/v4${path}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'X-Auth-Token': FOOTBALLDATA_KEY },
      });
      if (res.status === 429) {
        const wait = attempt * 20000;
        console.warn(`  ⏳ [FD] 429 Too Many Requests. ${wait/1000}秒待機...`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) { console.warn(`  ⚠️ [FD] HTTP ${res.status}: ${url}`); return null; }
      return res.json();
    } catch (e) {
      console.warn(`  ⚠️ [FD] fetch error (${attempt}/${retries}): ${e.message}`);
      if (attempt < retries) await sleep(5000);
    }
  }
  return null;
}

// ────────────────────────────────────────────────
// playerMap から複数キーで選手名を検索するヘルパー
// fetch_players.js が name/shortName/tla を全キーとして保存しているため、
// RapidAPI が返すどの表記でもヒットする
// ────────────────────────────────────────────────
function lookupPlayers(playerMap, ...teamNames) {
  const result = new Set();
  for (const name of teamNames) {
    if (!name) continue;
    // 完全一致
    for (const p of (playerMap[name] || [])) result.add(p);
    // "FC" / "AFC" / "CF" / "SC" 等の接尾辞を除いた短縮名で再試行
    const stripped = name.replace(/\s+(FC|AFC|CF|SC|AC|BC|FK|SK|IF|BK|IK|NK|HNK|RCD|SV|TSG|VfL|VfB|RB|1\.\s*FC|1\.\s*FSV|SSC|AS|US|SS|CD|UD|SD|CP|SCP|GD|SL|CS|RC|OGC|SM|EA|En\s+Avant|Sporting\s+CP)\s*$/i, '').trim();
    if (stripped !== name) {
      for (const p of (playerMap[stripped] || [])) result.add(p);
    }
    // 先頭の "FC " 等を除いた名前でも試行
    const prefixStripped = name.replace(/^(FC|AFC|CF|SC|AC|BC|FK|SK)\s+/i, '').trim();
    if (prefixStripped !== name) {
      for (const p of (playerMap[prefixStripped] || [])) result.add(p);
    }
  }
  return [...result];
}

// ────────────────────────────────────────────────
// エンブレムマップ構築（football-data.org）
// ────────────────────────────────────────────────
async function buildCrestMap() {
  const CACHE_PATH = 'data/crests.json';

  if (fs.existsSync(CACHE_PATH)) {
    const cached = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    const { _updatedAt, ...crestMap } = cached;
    console.log(`\n🏅 エンブレムキャッシュ読み込み: ${Object.keys(crestMap).length}エントリ (更新: ${_updatedAt})\n`);
    return crestMap;
  }

  if (!FOOTBALLDATA_KEY || FD_CREST_COMPETITIONS.length === 0) return {};

  console.log('\n🏅 football-data.org からエンブレムデータを取得中...');
  const crestMap = {};

  for (let i = 0; i < FD_CREST_COMPETITIONS.length; i++) {
    const compId = FD_CREST_COMPETITIONS[i];
    const data = await fdFetch(`/competitions/${compId}/teams`);
    if (data?.teams) {
      data.teams.forEach(t => {
        if (t.crest) {
          if (t.name)      crestMap[t.name]      = t.crest;
          if (t.shortName) crestMap[t.shortName] = t.crest;
          if (t.tla)       crestMap[t.tla]       = t.crest;
        }
      });
      console.log(`  ✅ competition ${compId}: ${data.teams.length}チーム`);
    } else {
      console.log(`  － competition ${compId}: データなし`);
    }
    if (i < FD_CREST_COMPETITIONS.length - 1) await sleep(7000);
  }

  const jstStr = new Date(Date.now() + 9*60*60*1000).toISOString().replace('T', ' ').slice(0, 16);
  fs.writeFileSync(CACHE_PATH, JSON.stringify({ _updatedAt: jstStr, ...crestMap }, null, 2));
  console.log(`  📦 エンブレムマップ: ${Object.keys(crestMap).length}エントリ (data/crests.json にキャッシュ保存)\n`);
  return crestMap;
}

// ────────────────────────────────────────────────
// 選手マップ読み込み
// ────────────────────────────────────────────────
function loadPlayerMap() {
  const path = 'data/players.json';
  if (!fs.existsSync(path)) {
    console.warn('⚠️ data/players.json が見つかりません。');
    return {};
  }
  const saved = JSON.parse(fs.readFileSync(path, 'utf-8'));
  const map = saved.players || {};
  const uniquePlayers = new Set(Object.values(map).flat());
  console.log(`📋 選手データ: ${Object.keys(map).length}キー / ${uniquePlayers.size}人 (更新: ${saved.updatedAt})`);
  return map;
}

// ────────────────────────────────────────────────
// football-data.org クラブ試合取得
// ────────────────────────────────────────────────
async function fdFetchMatches(compId, playerMap, meta) {
  const now      = Date.now();
  const dateFrom = new Date().toISOString().split('T')[0];
  const dateTo   = new Date(now + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const data = await fdFetch(
    `/competitions/${compId}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED`
  );
  if (!data?.matches) return null;

  return data.matches
    .filter(m => m.utcDate && new Date(m.utcDate).getTime() > now)
    .map(m => {
      const home = m.homeTeam?.name || '';
      const away = m.awayTeam?.name || '';
      if (!home || !away) return null;

      // lookupPlayers で name/shortName/tla の全バリエーションを検索
      const japanese = meta.national
        ? []
        : lookupPlayers(
            playerMap,
            home,
            away,
            m.homeTeam?.shortName,
            m.awayTeam?.shortName,
            m.homeTeam?.tla,
            m.awayTeam?.tla,
          );

      return {
        kickoffUTC: m.utcDate,
        home,
        away,
        homeCrest: m.homeTeam?.crest || null,
        awayCrest: m.awayTeam?.crest || null,
        league:    meta.key,
        lClass:    meta.lClass,
        tab:       meta.tab,
        gender:    meta.gender,
        national:  meta.national || false,
        youth:     meta.youth    || false,
        japanese,
        source:    'fd',
      };
    })
    .filter(Boolean);
}

// ────────────────────────────────────────────────
// RapidAPI 試合取得
// ────────────────────────────────────────────────
async function rapidFetchMatches(league, playerMap, crestMap) {
  const data = await rapidFetch(`/football-get-all-matches-by-league?leagueid=${league.id}`);
  if (data === null)             return null;
  if (!data?.response?.matches) return null;

  const now = Date.now();
