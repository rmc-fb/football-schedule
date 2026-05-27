// scripts/fetch_sofascore.js
// Sofascore から試合日程・キックオフ時刻・選手スタッツを取得し
// data/matches.json と data/player_stats.json に保存する
//
// 実行: node scripts/fetch_sofascore.js
// 強制更新: FORCE_UPDATE=1 node scripts/fetch_sofascore.js
//
// ⚠️  Sofascore の非公式APIを利用します。
//     利用規約に従い、過度なリクエストを避けてください。

'use strict';
const fs   = require('fs');
const path = require('path');

// ─────────────────────────────────────────────
// 設定
// ─────────────────────────────────────────────

// 取得する日程範囲（今日 ± N日）
const DAYS_BEFORE = 3;
const DAYS_AFTER  = 14;

// Sofascore のスポーツID（サッカー = 1）
const SPORT_ID = 1;

// 対象リーグ（Sofascore の tournamentId）
// ※ tournamentId は URL から確認できます
// 例: https://www.sofascore.com/tournament/football/england/premier-league/17
const TARGET_TOURNAMENTS = [
  { id: 17,   name: "EPL",              lClass: "l-epl",   tab: "europe",  gender: "male" },
  { id: 8,    name: "LaLiga",           lClass: "l-laliga", tab: "europe", gender: "male" },
  { id: 35,   name: "Bundesliga",       lClass: "l-bund",  tab: "europe",  gender: "male" },
  { id: 23,   name: "Serie A",          lClass: "l-serie", tab: "europe",  gender: "male" },
  { id: 34,   name: "Ligue 1",          lClass: "l-ligue", tab: "europe",  gender: "male" },
  { id: 238,  name: "Liga Portugal",    lClass: "l-ligap", tab: "europe",  gender: "male" },
  { id: 37,   name: "Eredivisie",       lClass: "l-erediv",tab: "europe",  gender: "male" },
  { id: 955,  name: "Scottish Prem",    lClass: "l-spl",   tab: "europe",  gender: "male" },
  { id: 18,   name: "Championship",     lClass: "l-champ2",tab: "europe",  gender: "male" },
  { id: 7,    name: "Champions League", lClass: "l-champ", tab: "europe",  gender: "male" },
  { id: 679,  name: "Europa League",    lClass: "l-uel",   tab: "europe",  gender: "male" },
  { id: 17015,name: "Conference League",lClass: "l-uel",   tab: "europe",  gender: "male" },
  { id: 182,  name: "Saudi Pro League", lClass: "l-middle",tab: "middle",  gender: "male" },
  { id: 955,  name: "MLS",              lClass: "l-north", tab: "north",   gender: "male" },
];

// 日本人選手名（英語）→ 日本語マッピング（fetch_players.js から流用）
const PLAYER_JA = {
  "Kaoru Mitoma":      "三笘薫",
  "Wataru Endō":       "遠藤航",
  "Wataru Endo":       "遠藤航",
  "Takefusa Kubo":     "久保建英",
  "Daizen Maeda":      "前田大然",
  "Kyogo Furuhashi":   "古橋亨梧",
  "Ayase Ueda":        "上田綺世",
  "Keito Nakamura":    "中村敬斗",
  "Takumi Minamino":   "南野拓実",
  "Ritsu Doan":        "堂安律",
  "Hiroki Ito":        "伊藤洋輝",
  "Ko Itakura":        "板倉滉",
  "Mao Hosoya":        "細谷真大",
  "Yukinari Sugawara": "菅原由勢",
  "Takehiro Tomiyasu": "冨安健洋",
  "Reo Hatate":        "旗手怜央",
  "Yuki Kobayashi":    "小林友希",
  "Shogo Taniguchi":   "谷口彰悟",
  "Ao Tanaka":         "田中碧",
  "Junya Ito":         "伊東純也",
  "Yuki Soma":         "相馬勇紀",
  "Tomoki Iwata":      "岩田智輝",
  "Shogo Asano":       "浅野拓磨",
  "Koji Miyoshi":      "三好康児",
  "Daichi Kamada":     "鎌田大地",
  "Hidemasa Morita":   "守田英正",
  "Shuichi Gonda":     "権田修一",
  "Zion Suzuki":       "鈴木彩艶",
  "Kaishu Sano":       "佐野海舟",
  "Sota Kawasaki":     "川崎颯太",
  "Yuya Osako":        "大迫勇也",
  "Koki Machida":      "町田浩樹",
};

// 日本人選手の英語名セット（高速検索用）
const JAPANESE_PLAYERS_EN = new Set(Object.keys(PLAYER_JA));

// ─────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Sofascore API 共通ヘッダー
function sofaHeaders() {
  return {
    'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept':           'application/json',
    'Accept-Language':  'ja,en-US;q=0.9,en;q=0.8',
    'Referer':          'https://www.sofascore.com/',
    'Origin':           'https://www.sofascore.com',
    'Cache-Control':    'no-cache',
    'Pragma':           'no-cache',
  };
}

async function sofaFetch(endpoint, retries = 3) {
  const url = `https://api.sofascore.com/api/v1${endpoint}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: sofaHeaders() });
      if (res.status === 429) {
        const wait = attempt * 15000;
        console.warn(`  ⏳ 429 Rate Limit. ${wait / 1000}秒待機...`);
        await sleep(wait);
        continue;
      }
      if (res.status === 404) return null; // データなし（正常）
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

// YYYY-MM-DD 形式の日付配列を生成
function getDateRange(beforeDays, afterDays) {
  const dates = [];
  const now = new Date();
  for (let i = -beforeDays; i <= afterDays; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// UTC文字列に変換
function toUTCString(timestamp) {
  return new Date(timestamp * 1000).toISOString();
}

// ─────────────────────────────────────────────
// 試合日程取得（日付 × リーグ）
// ─────────────────────────────────────────────
async function fetchMatchesByDate(date, tournament) {
  // Sofascore: /tournament/{id}/season/{seasonId}/events/last/0
  // または日付指定: /sport/football/scheduled-events/{date}
  const data = await sofaFetch(`/sport/football/scheduled-events/${date}`);
  if (!data?.events) return [];

  const matches = [];
  for (const ev of data.events) {
    // 対象トーナメントIDに一致するものだけ抽出
    const tid = ev.tournament?.uniqueTournament?.id;
    if (tid !== tournament.id) continue;

    const kickoffUTC = toUTCString(ev.startTimestamp);
    const homeTeam   = ev.homeTeam?.name || '';
    const awayTeam   = ev.awayTeam?.name || '';
    const homeCrest  = ev.homeTeam?.id
      ? `https://api.sofascore.com/api/v1/team/${ev.homeTeam.id}/image`
      : null;
    const awayCrest  = ev.awayTeam?.id
      ? `https://api.sofascore.com/api/v1/team/${ev.awayTeam.id}/image`
      : null;

    matches.push({
      sofascoreId: ev.id,
      kickoffUTC,
      home:      homeTeam,
      away:      awayTeam,
      homeCrest,
      awayCrest,
      league:    tournament.name,
      lClass:    tournament.lClass,
      tab:       tournament.tab,
      gender:    tournament.gender,
      national:  false,
      youth:     false,
      japanese:  [], // 後で選手データを付与
      source:    'sofascore',
    });
  }
  return matches;
}

// ─────────────────────────────────────────────
// 試合の出場選手を取得し日本人を抽出
// ─────────────────────────────────────────────
async function fetchJapanesePlayers(sofascoreId) {
  // リネアップエンドポイント
  const data = await sofaFetch(`/event/${sofascoreId}/lineups`);
  if (!data) return [];

  const japanese = [];
  const sides = [data.home?.players, data.away?.players].filter(Boolean);
  for (const side of sides) {
    for (const p of side) {
      const name = p.player?.name || '';
      if (JAPANESE_PLAYERS_EN.has(name)) {
        japanese.push(name);
      }
      // 国籍チェック（Sofascoreが提供している場合）
      if (!JAPANESE_PLAYERS_EN.has(name) && p.player?.nationality === 'Japan') {
        japanese.push(name);
        // 動的に追加（キャッシュ）
        JAPANESE_PLAYERS_EN.add(name);
      }
    }
  }
  return [...new Set(japanese)];
}

// ─────────────────────────────────────────────
// 試合後スタッツ取得（直近N日分）
// ─────────────────────────────────────────────
async function fetchPlayerStats(sofascoreId, matchInfo) {
  const data = await sofaFetch(`/event/${sofascoreId}/player-statistics`);
  if (!data) return null;

  const statsMap = {};
  const sides = ['home', 'away'];
  for (const side of sides) {
    const groups = data[side]?.groups || [];
    for (const group of groups) {
      for (const item of (group.statisticsItems || [])) {
        const name = item.player?.name || '';
        if (!JAPANESE_PLAYERS_EN.has(name)) continue;
        if (!statsMap[name]) statsMap[name] = {};
        statsMap[name][item.name] = item.value;
      }
    }
  }

  if (Object.keys(statsMap).length === 0) return null;

  return {
    matchId:     sofascoreId,
    kickoffUTC:  matchInfo.kickoffUTC,
    home:        matchInfo.home,
    away:        matchInfo.away,
    league:      matchInfo.league,
    playerStats: statsMap,
  };
}

// ─────────────────────────────────────────────
// player_stats.json の更新
// ─────────────────────────────────────────────
async function updatePlayerStats(matches) {
  console.log('\n📊 選手スタッツ取得（直近試合）...');

  const STATS_PATH = 'data/player_stats.json';
  let existing = {};
  if (fs.existsSync(STATS_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(STATS_PATH, 'utf-8')); } catch {}
  }

  // 直近3日以内の試合のみスタッツ取得（終了試合）
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 3);

  let updated = 0;
  for (const m of matches) {
    if (!m.sofascoreId) continue;
    const kickoff = new Date(m.kickoffUTC);
    if (kickoff > new Date()) continue;      // 未来の試合はスキップ
    if (kickoff < cutoff) continue;          // 3日以上前はスキップ
    if (existing[m.sofascoreId]) continue;   // 取得済みはスキップ

    await sleep(800); // レート制限対策
    const stats = await fetchPlayerStats(m.sofascoreId, m);
    if (stats) {
      existing[m.sofascoreId] = stats;
      updated++;
      const names = Object.keys(stats.playerStats).map(n => PLAYER_JA[n] || n);
      console.log(`  ✅ ${m.home} vs ${m.away}: ${names.join(', ')}`);
    }
  }

  // 古いデータ削除（30日以上前）
  const expire = new Date();
  expire.setDate(expire.getDate() - 30);
  for (const [id, s] of Object.entries(existing)) {
    if (new Date(s.kickoffUTC) < expire) delete existing[id];
  }

  const jstStr = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString().replace('T', ' ').slice(0, 16);
  fs.writeFileSync(STATS_PATH, JSON.stringify({ updatedAt: jstStr, stats: existing }, null, 2));
  console.log(`  💾 player_stats.json 保存 (新規: ${updated}件)`);
  return existing;
}

// ─────────────────────────────────────────────
// メイン
// ─────────────────────────────────────────────
async function main() {
  if (!fs.existsSync('data')) fs.mkdirSync('data');

  const dates = getDateRange(DAYS_BEFORE, DAYS_AFTER);
  console.log(`\n📅 取得期間: ${dates[0]} 〜 ${dates[dates.length - 1]}`);
  console.log(`🏟  対象リーグ: ${TARGET_TOURNAMENTS.length}リーグ\n`);

  // ── 1. 既存の matches.json を読み込み（非Sofascoreデータを保持）────
  const MATCHES_PATH = 'data/matches.json';
  let existingMatches = [];
  let updatedAt = '';
  if (fs.existsSync(MATCHES_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(MATCHES_PATH, 'utf-8'));
      // football-data.org / RapidAPI 由来のデータを保持
      existingMatches = (existing.matches || []).filter(m => m.source !== 'sofascore');
      updatedAt = existing.updatedAt || '';
    } catch {}
  }

  // ── 2. Sofascore から日程取得 ────────────────────────────────────
  const sofascoreMatches = [];
  const seenIds = new Set();

  for (let di = 0; di < dates.length; di++) {
    const date = dates[di];
    process.stdout.write(`[${String(di + 1).padStart(2)}/${dates.length}] ${date}  `);

    let dayCount = 0;
    for (const tournament of TARGET_TOURNAMENTS) {
      await sleep(300); // 過負荷防止
      const matches = await fetchMatchesByDate(date, tournament);
      for (const m of matches) {
        if (seenIds.has(m.sofascoreId)) continue;
        seenIds.add(m.sofascoreId);
        sofascoreMatches.push(m);
        dayCount++;
      }
    }
    console.log(`${dayCount}試合`);

    // 日付をまたぐたびに少し待機
    if (di < dates.length - 1) await sleep(500);
  }

  console.log(`\n✅ Sofascore 取得完了: ${sofascoreMatches.length}試合\n`);

  // ── 3. ラインナップ取得（日本人選手チェック）───────────────────────
  console.log('👥 ラインナップ確認（日本人選手検索）...');
  let lineupChecked = 0;
  for (const m of sofascoreMatches) {
    // 直近7日以内の試合のみラインナップ確認
    const daysFromNow = (new Date(m.kickoffUTC) - new Date()) / (1000 * 60 * 60 * 24);
    if (daysFromNow > 7 || daysFromNow < -1) continue;

    await sleep(500);
    const japanese = await fetchJapanesePlayers(m.sofascoreId);
    if (japanese.length > 0) {
      m.japanese = japanese;
      const names = japanese.map(n => PLAYER_JA[n] || n);
      console.log(`  🇯🇵 ${m.home} vs ${m.away} (${m.league}): ${names.join(', ')}`);
    }
    lineupChecked++;
  }
  console.log(`  📋 ラインナップ確認: ${lineupChecked}試合\n`);

  // ── 4. 既存データと統合 ─────────────────────────────────────────
  // 期間外の既存データを削除
  const rangeStart = new Date(dates[0]);
  const rangeEnd   = new Date(dates[dates.length - 1] + 'T23:59:59Z');
  const filteredExisting = existingMatches.filter(m => {
    const d = new Date(m.kickoffUTC);
    return d < rangeStart || d > rangeEnd; // 範囲外のみ保持
  });

  const allMatches = [...filteredExisting, ...sofascoreMatches];

  // kickoffUTC でソート
  allMatches.sort((a, b) => new Date(a.kickoffUTC) - new Date(b.kickoffUTC));

  // ── 5. matches.json 保存 ────────────────────────────────────────
  const jstStr = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString().replace('T', ' ').slice(0, 16);
  fs.writeFileSync(MATCHES_PATH, JSON.stringify({
    updatedAt: jstStr,
    matches:   allMatches,
  }, null, 2));

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ matches.json 保存完了`);
  console.log(`   Sofascore: ${sofascoreMatches.length}試合`);
  console.log(`   既存(他ソース): ${filteredExisting.length}試合`);
  console.log(`   合計: ${allMatches.length}試合`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── 6. 選手スタッツ取得・保存 ───────────────────────────────────
  await updatePlayerStats(sofascoreMatches);
}

main().catch(err => { console.error(err); process.exit(1); });
