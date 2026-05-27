// scripts/fetch_matches.js
'use strict';
const fs = require('fs');

const RAPID_KEY        = process.env.RAPIDAPI_KEY;
const RAPID_HOST       = 'free-api-live-football-data.p.rapidapi.com';
const BASE_URL         = `https://${RAPID_HOST}`;
const FOOTBALLDATA_KEY = process.env.FOOTBALLDATA_KEY;
const APIFY_TOKEN      = process.env.APIFY_TOKEN;
const APIFY_ACTOR      = 'parseforge~sofascore-live-scraper';

if (!RAPID_KEY)        console.warn('⚠️  RAPIDAPI_KEY が未設定。RapidAPI取得はスキップします。');
if (!FOOTBALLDATA_KEY) console.warn('⚠️  FOOTBALLDATA_KEY が未設定。FD取得はスキップします。');
if (!APIFY_TOKEN)      console.warn('⚠️  APIFY_TOKEN が未設定。Apify MLS取得はスキップします。');

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
  // 北米（MLSはApify経由に変更したが、RapidAPIもフォールバックとして残す）
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
  const upcoming = data.response.matches.filter(m => {
    if (!m.status?.utcTime) return false;
    if (m.status.finished || m.status.cancelled) return false;
    return new Date(m.status.utcTime).getTime() > now;
  });

  return upcoming.map(m => {
    const home      = m.home?.name      || m.home?.longName      || '';
    const away      = m.away?.name      || m.away?.longName      || '';
    const homeShort = m.home?.shortName || '';
    const awayShort = m.away?.shortName || '';
    if (!home || !away) return null;

    const homeCrest = m.home?.imageUrl || crestMap[home] || crestMap[homeShort] || null;
    const awayCrest = m.away?.imageUrl || crestMap[away] || crestMap[awayShort] || null;

    const japanese = league.national
      ? []
      : lookupPlayers(playerMap, home, away, homeShort, awayShort);

    return {
      kickoffUTC: m.status.utcTime,
      home,
      away,
      homeCrest,
      awayCrest,
      league:   league.key,
      lClass:   league.lClass,
      tab:      league.tab,
      gender:   league.gender || 'male',
      national: league.national || false,
      youth:    league.youth    || false,
      japanese,
      source:   'rapid',
    };
  }).filter(Boolean);
}

// ────────────────────────────────────────────────
// Apify経由 MLS試合取得
// Sofascore Live Events Scraperを使ってMLSの予定試合を取得する
// RapidAPIがMLSデータを返さない場合のメイン取得元として使用
// ────────────────────────────────────────────────
async function apifyFetchMLS(playerMap, crestMap) {
  if (!APIFY_TOKEN) return [];

  console.log('\n🏟️  Apify経由 MLS取得中...');

  // ① Actorを実行してRunを起動
  let runId;
  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR}/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQuery:  'MLS',
          sport:        'football',
          mode:         'events',
          maxItems:     200,
          fetchDetails: false,
        }),
      }
    );
    if (!runRes.ok) {
      console.warn(`  ⚠️ Apify Run起動失敗: HTTP ${runRes.status}`);
      return [];
    }
    const runData = await runRes.json();
    runId = runData?.data?.id;
    if (!runId) {
      console.warn('  ⚠️ Apify Run IDが取得できませんでした');
      return [];
    }
    console.log(`  ▶ Run ID: ${runId} — 完了待ち...`);
  } catch (e) {
    console.warn(`  ⚠️ Apify Run起動エラー: ${e.message}`);
    return [];
  }

  // ② Run完了まで最大3分ポーリング（8秒ごと）
  const maxWait = 180000;
  const interval = 8000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await sleep(interval);
    try {
      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );
      const statusData = await statusRes.json();
      const status = statusData?.data?.status;

      if (status === 'SUCCEEDED') {
        console.log(' 完了');
        break;
      }
      if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
        console.warn(`\n  ⚠️ Apify Run失敗: ${status}`);
        return [];
      }
      process.stdout.write('.');
    } catch (e) {
      console.warn(`\n  ⚠️ ステータス確認エラー: ${e.message}`);
      return [];
    }
  }

  // ③ Datasetから結果を取得
  let items;
  try {
    const dataRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_TOKEN}&clean=true`
    );
    if (!dataRes.ok) {
      console.warn(`  ⚠️ Dataset取得失敗: HTTP ${dataRes.status}`);
      return [];
    }
    items = await dataRes.json();
  } catch (e) {
    console.warn(`  ⚠️ Dataset取得エラー: ${e.message}`);
    return [];
  }

  if (!Array.isArray(items) || items.length === 0) {
    console.log('  － MLS: 0試合');
    return [];
  }

  // ④ MLSのみフィルタして既存フォーマットに変換
  const now = Date.now();
  const matches = items
    .filter(item => {
      // MLSの試合のみ（tournamentSlugで判定）
      if (item.tournamentSlug !== 'mls') return false;
      // 未来の試合のみ
      if (!item.startTimestamp) return false;
      return item.startTimestamp * 1000 > now;
    })
    .map(item => {
      const home      = item.homeTeam?.name || '';
      const away      = item.awayTeam?.name || '';
      const homeSlug  = item.homeTeam?.slug || '';
      const awaySlug  = item.awayTeam?.slug || '';
      if (!home || !away) return null;

      // Sofascoreのロゴ or エンブレムキャッシュを使用
      const homeCrest = item.homeTeam?.logo || crestMap[home] || null;
      const awayCrest = item.awayTeam?.logo || crestMap[away] || null;

      // 日本人選手の在籍確認（slug/nameで検索）
      const japanese = lookupPlayers(playerMap, home, away, homeSlug, awaySlug);

      return {
        kickoffUTC: item.startDate,          // ISO形式: "2026-07-16T23:30:00.000Z"
        home,
        away,
        homeCrest,
        awayCrest,
        league:   'MLS',
        lClass:   'l-north',
        tab:      'north',
        gender:   'male',
        national: false,
        youth:    false,
        japanese,
        source:   'apify',
      };
    })
    .filter(Boolean);

  console.log(`  ✅ Apify MLS: ${matches.length}試合`);
  return matches;
}

// ────────────────────────────────────────────────
// 代表戦取得
// ────────────────────────────────────────────────
async function fetchNationalMatches(playerMap, crestMap) {
  console.log('\n🌍 代表戦データ取得中...');
  const allMatches = [];

  for (let i = 0; i < FD_NATIONAL.length; i++) {
    const comp = FD_NATIONAL[i];
    process.stdout.write(`  [FD ${String(i+1).padStart(2)}/${FD_NATIONAL.length}] ${comp.key.padEnd(20)} `);

    const matches = await fdFetchMatches(comp.id, playerMap, comp);

    if (matches && matches.length > 0) {
      allMatches.push(...matches);
      console.log(`✅ FD: ${matches.length}試合`);
    } else {
      const fallback = RAPID_NATIONAL_FALLBACK[comp.key];
      if (fallback && RAPID_KEY) {
        const rapidMatches = await rapidFetchMatches(
          { ...fallback, key: comp.key },
          playerMap,
          crestMap
        );
        if (rapidMatches && rapidMatches.length > 0) {
          allMatches.push(...rapidMatches);
          console.log(`🔄 RapidAPI: ${rapidMatches.length}試合`);
        } else {
          console.log('－ 取得なし');
        }
      } else {
        console.log('－ 取得なし');
      }
    }

    if (i < FD_NATIONAL.length - 1) await sleep(7000);
  }

  console.log(`\n  📡 RapidAPI 代表戦取得 (${RAPID_NATIONAL.length}件)...`);
  for (let i = 0; i < RAPID_NATIONAL.length; i++) {
    const comp = RAPID_NATIONAL[i];
    process.stdout.write(`  [RA ${String(i+1).padStart(2)}/${RAPID_NATIONAL.length}] ${comp.key.padEnd(20)} `);

    const matches = await rapidFetchMatches(comp, playerMap, crestMap);
    if (matches === null) {
      console.log('❌ 取得失敗');
    } else if (matches.length === 0) {
      console.log('－ 取得なし');
    } else {
      allMatches.push(...matches);
      console.log(`✅ ${matches.length}試合`);
    }

    if (i < RAPID_NATIONAL.length - 1) await sleep(1000);
  }

  return allMatches;
}

// ────────────────────────────────────────────────
// メイン
// ────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync('data')) fs.mkdirSync('data');

  const crestMap  = await buildCrestMap();
  const playerMap = loadPlayerMap();

  const allMatches = [];
  const summary = { fd: 0, rapid: 0, apify: 0, failed: [] };

  console.log(`\n📅 football-data.org クラブ試合取得 (${FD_CLUB_LEAGUES.length}リーグ)...\n`);
  for (let i = 0; i < FD_CLUB_LEAGUES.length; i++) {
    const league = FD_CLUB_LEAGUES[i];
    process.stdout.write(`[${String(i+1).padStart(2)}/${FD_CLUB_LEAGUES.length}] ${league.key.padEnd(28)} `);

    const matches = await fdFetchMatches(league.id, playerMap, league);
    if (matches === null) {
      console.log('❌ 取得失敗');
      summary.failed.push(league.key);
    } else if (matches.length === 0) {
      console.log('－ 0試合');
    } else {
      allMatches.push(...matches);
      summary.fd += matches.length;
      console.log(`✅ ${matches.length}試合`);
    }

    if (i < FD_CLUB_LEAGUES.length - 1) await sleep(7000);
  }

  console.log(`\n📅 RapidAPI クラブ試合取得 (${RAPID_LEAGUES.length}リーグ)...\n`);
  for (let i = 0; i < RAPID_LEAGUES.length; i++) {
    const league = RAPID_LEAGUES[i];
    process.stdout.write(`[${String(i+1).padStart(2)}/${RAPID_LEAGUES.length}] ${league.key.padEnd(28)} `);

    const matches = await rapidFetchMatches(league, playerMap, crestMap);
    if (matches === null) {
      console.log('❌ 取得失敗');
      summary.failed.push(league.key);
    } else if (matches.length === 0) {
      console.log('－ 0試合');
    } else {
      allMatches.push(...matches);
      summary.rapid += matches.length;
      console.log(`✅ ${matches.length}試合`);
    }

    if (i < RAPID_LEAGUES.length - 1) await sleep(1000);
  }

  allMatches.push(...(await fetchNationalMatches(playerMap, crestMap)));

  // Apify経由 MLSデータ取得（メイン）
  const apifyMatches = await apifyFetchMLS(playerMap, crestMap);
  allMatches.push(...apifyMatches);
  summary.apify += apifyMatches.length;

  // 重複除去・ソート（同じ試合がRapidAPIとApifyで重複した場合、apifyを優先）
  // kickoffUTC|home|away をキーにして最後に追加されたもの（apify）で上書き
  const matchMap = new Map();
  for (const m of allMatches) {
    const key = `${m.kickoffUTC}|${m.home}|${m.away}`;
    // apifyは後から追加されるので、既存エントリがあってもapifyで上書き
    if (!matchMap.has(key) || m.source === 'apify') {
      matchMap.set(key, m);
    }
  }
  const unique = [...matchMap.values()];
  unique.sort((a, b) => a.kickoffUTC.localeCompare(b.kickoffUTC));

  // 保存
  const jstStr = new Date(Date.now() + 9*60*60*1000)
    .toISOString().replace('T', ' ').slice(0, 16);
  fs.writeFileSync('data/matches.json', JSON.stringify({ updatedAt: jstStr, matches: unique }, null, 2));

  // サマリー
  const byTab = {};
  unique.forEach(m => { byTab[m.tab] = (byTab[m.tab] || 0) + 1; });
  const jpMatches = unique.filter(m => m.japanese.length > 0).length;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 保存完了: 合計 ${unique.length}試合`);
  Object.entries(byTab).forEach(([tab, cnt]) => console.log(`   ${tab.padEnd(12)}: ${cnt}試合`));
  console.log(`   ソース    : FD ${summary.fd}試合 / RapidAPI ${summary.rapid}試合 / Apify ${summary.apify}試合`);
  console.log(`   日本人関連: ${jpMatches}試合`);
  if (summary.failed.length > 0) {
    console.log(`   ❌ 取得失敗: ${summary.failed.join(', ')}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(err => { console.error(err); process.exit(1); });
