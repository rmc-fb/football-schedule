// scripts/fetch_matches.js
// RapidAPI (free-api-live-football-data) から試合データを取得して data/matches.json に保存
// エンブレムは RapidAPI になければ football-data.org で補完
// 実行: RAPIDAPI_KEY=xxx FOOTBALLDATA_KEY=xxx node scripts/fetch_matches.js

'use strict';
const fs = require('fs');

const RAPID_KEY       = process.env.RAPIDAPI_KEY;
const RAPID_HOST      = 'free-api-live-football-data.p.rapidapi.com';
const BASE_URL        = `https://${RAPID_HOST}`;
const FOOTBALLDATA_KEY = process.env.FOOTBALLDATA_KEY;

if (!RAPID_KEY) {
  console.error('❌ 環境変数 RAPIDAPI_KEY が未設定');
  process.exit(1);
}
if (!FOOTBALLDATA_KEY) {
  console.warn('⚠️  FOOTBALLDATA_KEY が未設定。エンブレム補完はスキップします。');
}

// ────────────────────────────────────────────────
// 取得対象リーグ設定
// ────────────────────────────────────────────────
const LEAGUES = [
  // ── 欧州 5大リーグ ──
  { id: 1,   key: 'EPL',              lClass: 'l-epl',     tab: 'europe',   gender: 'male'   },
  { id: 2,   key: 'LaLiga',           lClass: 'l-laliga',  tab: 'europe',   gender: 'male'   },
  { id: 3,   key: 'Bundesliga',       lClass: 'l-bund',    tab: 'europe',   gender: 'male'   },
  { id: 4,   key: 'Serie A',          lClass: 'l-serie',   tab: 'europe',   gender: 'male'   },
  { id: 5,   key: 'Ligue 1',          lClass: 'l-ligue',   tab: 'europe',   gender: 'male'   },
  // ── 欧州 その他クラブ ──
  { id: 7,   key: 'Eredivisie',       lClass: 'l-erediv',  tab: 'europe',   gender: 'male'   },
  { id: 8,   key: 'Liga Portugal',    lClass: 'l-ligap',   tab: 'europe',   gender: 'male'   },
  { id: 9,   key: 'Scottish Prem',    lClass: 'l-spl',     tab: 'europe',   gender: 'male'   },
  { id: 10,  key: 'Championship',     lClass: 'l-champ2',  tab: 'europe',   gender: 'male'   },
  { id: 40,  key: 'Belgian Pro League', lClass: 'l-belgique', tab: 'europe', gender: 'male'  },
  { id: 6,   key: 'Super Lig',        lClass: 'l-champ2',  tab: 'europe',   gender: 'male'   },
  // ── 欧州 カップ戦 ──
  { id: 42,  key: 'Champions League', lClass: 'l-champ',   tab: 'europe',   gender: 'male'   },
  { id: 73,  key: 'Europa League',    lClass: 'l-uel',     tab: 'europe',   gender: 'male'   },
  { id: 10216, key: 'Conference League', lClass: 'l-uel',  tab: 'europe',   gender: 'male'   },
  // ── 欧州 女子 ──
  { id: 9375, key: 'Women Champions League', lClass: 'l-womens', tab: 'europe', gender: 'female' },
  { id: 293,  key: 'Women Friendlies',       lClass: 'l-womens', tab: 'national', gender: 'female', national: true },
  // ── 中東 ──
  { id: 307, key: 'Saudi Pro League', lClass: 'l-middle',  tab: 'middle',   gender: 'male'   },
  { id: 435, key: 'UAE Pro League',   lClass: 'l-middle',  tab: 'middle',   gender: 'male'   },
  { id: 420, key: 'Qatar Stars',      lClass: 'l-middle',  tab: 'middle',   gender: 'male'   },
  { id: 525, key: 'AFC Champions',    lClass: 'l-middle',  tab: 'middle',   gender: 'male'   },
  // ── 北米 ──
  { id: 12,  key: 'MLS',             lClass: 'l-north',   tab: 'north',    gender: 'male'   },
  { id: 13,  key: 'Liga MX',         lClass: 'l-north',   tab: 'north',    gender: 'male'   },
  { id: 474, key: 'NWSL',            lClass: 'l-womens',  tab: 'north',    gender: 'female' },
  // ── 代表戦（男子） ──
  { id: 77,  key: 'World Cup',       lClass: 'l-wc',      tab: 'national', gender: 'male',  national: true },
  { id: 50,  key: 'EURO',            lClass: 'l-champ',   tab: 'national', gender: 'male',  national: true },
  { id: 44,  key: 'Copa America',    lClass: 'l-champ',   tab: 'national', gender: 'male',  national: true },
  { id: 289, key: 'AFCON',           lClass: 'l-champ',   tab: 'national', gender: 'male',  national: true },
  { id: 290, key: 'Asian Cup',       lClass: 'l-champ',   tab: 'national', gender: 'male',  national: true },
  { id: 298, key: 'CONCACAF Gold Cup', lClass: 'l-champ', tab: 'national', gender: 'male',  national: true },
  { id: 9806, key: 'Nations League', lClass: 'l-champ',   tab: 'national', gender: 'male',  national: true },
  { id: 114,  key: 'Friendly',       lClass: 'l-muted',   tab: 'national', gender: 'male',  national: true },
  // ── 代表戦（女子） ──
  { id: 76,  key: 'Women World Cup', lClass: 'l-wc',      tab: 'national', gender: 'female', national: true },
  { id: 292, key: 'Women EURO',      lClass: 'l-champ',   tab: 'national', gender: 'female', national: true },
  // ── ユース代表 ──
  { id: 10369, key: 'U-20 World Cup',  lClass: 'l-youth', tab: 'youth',    gender: 'male',  national: true, youth: true },
  { id: 306,   key: 'U-17 World Cup',  lClass: 'l-youth', tab: 'youth',    gender: 'male',  national: true, youth: true },
  { id: 9571,  key: 'U-23 Asian Cup',  lClass: 'l-youth', tab: 'youth',    gender: 'male',  national: true, youth: true },
  { id: 9841,  key: 'U-20 Asian Cup',  lClass: 'l-youth', tab: 'youth',    gender: 'male',  national: true, youth: true },
  { id: 288,   key: 'UEFA U21',        lClass: 'l-youth', tab: 'youth',    gender: 'male',  national: true, youth: true },
];

// ────────────────────────────────────────────────
// football-data.org のリーグID（無料プランで取得可能なもの）
// https://www.football-data.org/coverage
// ────────────────────────────────────────────────
const FD_COMPETITION_IDS = [
  2021, // EPL
  2014, // LaLiga
  2002, // Bundesliga
  2019, // Serie A
  2015, // Ligue 1
  2003, // Eredivisie
  2017, // Liga Portugal
  2000, // World Cup
  2001, // Champions League
  2018, // Europa League
  2152, // Copa Libertadores（参考）
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
        const wait = attempt * 15000;
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

async function fdFetch(path, retries = 3) {
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
      if (!res.ok) {
        console.warn(`  ⚠️ [FD] HTTP ${res.status}: ${url}`);
        return null;
      }
      return res.json();
    } catch (e) {
      console.warn(`  ⚠️ [FD] fetch error (${attempt}/${retries}): ${e.message}`);
      if (attempt < retries) await sleep(5000);
    }
  }
  return null;
}

// ────────────────────────────────────────────────
// football-data.org からエンブレムマップを構築
// { "Arsenal": "https://crests.football-data.org/57.png", ... }
// ────────────────────────────────────────────────
async function buildCrestMap() {
  if (!FOOTBALLDATA_KEY) return {};

  console.log('\n🏅 football-data.org からエンブレムデータを取得中...');
  const crestMap = {};
  let totalTeams = 0;

  for (let i = 0; i < FD_COMPETITION_IDS.length; i++) {
    const compId = FD_COMPETITION_IDS[i];
    const data = await fdFetch(`/competitions/${compId}/teams`);

    if (data?.teams) {
      data.teams.forEach(t => {
        // name / shortName / tla の3パターンで登録（チーム名の表記ゆれ対策）
        if (t.crest) {
          if (t.name)      crestMap[t.name]      = t.crest;
          if (t.shortName) crestMap[t.shortName] = t.crest;
          if (t.tla)       crestMap[t.tla]       = t.crest;
          totalTeams++;
        }
      });
      console.log(`  ✅ competition ${compId}: ${data.teams.length}チーム取得`);
    } else {
      console.log(`  － competition ${compId}: データなし`);
    }

    // football-data.org 無料プランは1分10リクエスト制限
    // リーグ間に7秒待機（安全マージン込み）
    if (i < FD_COMPETITION_IDS.length - 1) await sleep(7000);
  }

  console.log(`  📦 エンブレムマップ完成: ${Object.keys(crestMap).length}エントリ (${totalTeams}チーム)\n`);
  return crestMap;
}

// ────────────────────────────────────────────────
// 選手マップ読み込み
// ────────────────────────────────────────────────
function loadPlayerMap() {
  const path = 'data/players.json';
  if (!fs.existsSync(path)) {
    console.warn('⚠️ data/players.json が見つかりません。日本人選手情報なしで続行します。');
    return {};
  }
  const saved = JSON.parse(fs.readFileSync(path, 'utf-8'));
  const map = saved.players || {};
  const total = Object.values(map).flat().length;
  console.log(`📋 選手データ読み込み完了: ${Object.keys(map).length}チーム / ${total}人 (更新: ${saved.updatedAt})`);
  return map;
}

// ────────────────────────────────────────────────
// 1リーグ分の試合を取得・整形
// ────────────────────────────────────────────────
async function fetchLeagueMatches(league, playerMap, crestMap) {
  const data = await rapidFetch(`/football-get-all-matches-by-league?leagueid=${league.id}`);
  if (!data?.response?.matches) return [];

  const now = Date.now();

  const upcoming = data.response.matches.filter(m => {
    if (!m.status?.utcTime) return false;
    if (m.status.finished || m.status.cancelled) return false;
    return new Date(m.status.utcTime).getTime() > now;
  });

  return upcoming.map(m => {
    const home = m.home?.name || m.home?.longName || '';
    const away = m.away?.name || m.away?.longName || '';
    if (!home || !away) return null;

    // エンブレム: RapidAPIを優先、なければfootball-data.orgで補完
    const homeCrest = m.home?.imageUrl
      || crestMap[home]
      || crestMap[m.home?.shortName]
      || null;
    const awayCrest = m.away?.imageUrl
      || crestMap[away]
      || crestMap[m.away?.shortName]
      || null;

    // 日本人選手（players.json のチーム名と照合）
    const japanese = [
      ...(playerMap[home] || []),
      ...(playerMap[away] || []),
      ...(playerMap[m.home?.shortName] || []),
      ...(playerMap[m.away?.shortName] || []),
    ];
    const uniqueJapanese = [...new Set(japanese)];

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
      japanese: uniqueJapanese,
    };
  }).filter(Boolean);
}

// ────────────────────────────────────────────────
// メイン
// ────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync('data')) fs.mkdirSync('data');

  // football-data.org からエンブレムマップを先に構築
  const crestMap = await buildCrestMap();

  const playerMap = loadPlayerMap();

  console.log(`\n📅 試合データ取得開始 (${LEAGUES.length}リーグ)...\n`);

  const allMatches = [];
  let successCount = 0;
  let errorCount   = 0;
  let crestHitCount = 0;

  for (let i = 0; i < LEAGUES.length; i++) {
    const league = LEAGUES[i];
    process.stdout.write(`[${String(i+1).padStart(2)}/${LEAGUES.length}] ${league.key.padEnd(28)} `);

    const matches = await fetchLeagueMatches(league, playerMap, crestMap);
    allMatches.push(...matches);
    successCount++;

    const withCrest = matches.filter(m => m.homeCrest || m.awayCrest).length;
    crestHitCount += withCrest;
    console.log(`✅ ${matches.length}試合 (エンブレムあり: ${withCrest}試合)`);

    if (i < LEAGUES.length - 1) await sleep(1000);
  }

  // 重複除去・ソート
  const seen   = new Set();
  const unique = allMatches.filter(m => {
    const key = `${m.kickoffUTC}|${m.home}|${m.away}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  unique.sort((a, b) => a.kickoffUTC.localeCompare(b.kickoffUTC));

  const now    = new Date();
  const jstStr = new Date(now.getTime() + 9*60*60*1000)
    .toISOString().replace('T', ' ').slice(0, 16);

  const output = { updatedAt: jstStr, matches: unique };
  fs.writeFileSync('data/matches.json', JSON.stringify(output, null, 2));

  // サマリー
  const byTab = {};
  unique.forEach(m => { byTab[m.tab] = (byTab[m.tab] || 0) + 1; });
  const jpMatches     = unique.filter(m => m.japanese.length > 0).length;
  const withCrestTotal = unique.filter(m => m.homeCrest || m.awayCrest).length;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 保存完了: 合計 ${unique.length}試合`);
  Object.entries(byTab).forEach(([tab, cnt]) => console.log(`   ${tab.padEnd(12)}: ${cnt}試合`));
  console.log(`   日本人関連: ${jpMatches}試合`);
  console.log(`   エンブレムあり: ${withCrestTotal}/${unique.length}試合`);
  console.log(`   取得成功: ${successCount}/${LEAGUES.length}リーグ`);
  if (errorCount > 0) console.log(`   ⚠️ エラー: ${errorCount}リーグ`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(err => { console.error(err); process.exit(1); });
