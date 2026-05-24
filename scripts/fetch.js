const fs = require('fs');

const apiKey = process.env.RAPIDAPI_KEY;
const HOST = 'free-api-live-football-data.p.rapidapi.com';
const BASE = `https://${HOST}`;

const LEAGUES = [
  { id: 47,  key: 'EPL',              lClass: 'l-epl'    }, // プレミアリーグ
  { id: 87,  key: 'LaLiga',           lClass: 'l-laliga' }, // ラ・リーガ
  { id: 54,  key: 'Bundesliga',       lClass: 'l-bund'   }, // ブンデスリーガ
  { id: 55,  key: 'Serie A',          lClass: 'l-serie'  }, // セリエA
  { id: 53,  key: 'Ligue 1',          lClass: 'l-ligue'  }, // リーグ・アン
  { id: 42,  key: 'Champions League', lClass: 'l-champ'  }, // CL
  { id: 73,  key: 'Europa League',    lClass: 'l-uel'    }, // EL
];

// ⚠️ APIの短縮チーム名に合わせること（"Brighton"であって"Brighton & Hove Albion FC"ではない）
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

async function fetchLeague(leagueId) {
  const url = `${BASE}/football-get-all-matches-by-league?leagueid=${leagueId}`;
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': HOST
    }
  });
  if (!res.ok) { console.warn(`League ${leagueId}: HTTP ${res.status}`); return []; }
  const data = await res.json();
  return data?.response?.matches || [];
}

async function main() {
  const allMatches = [];
  const now = new Date();
  const cutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

  for (const league of LEAGUES) {
    console.log(`取得中: ${league.key}`);
    const matches = await fetchLeague(league.id);
    console.log(`  → ${matches.length}件取得`);

    for (const m of matches) {
      if (m.status?.finished) continue;
      const kickoffUTC = m.status?.utcTime;
      if (!kickoffUTC || kickoffUTC < cutoff) continue;

      const home = m.home?.name || '';
      const away = m.away?.name || '';
      if (!home || !away) continue;

      const japanese = [
        ...(JAPANESE_PLAYERS[home] || []),
        ...(JAPANESE_PLAYERS[away] || []),
      ];

      allMatches.push({ kickoffUTC, home, away, league: league.key, lClass: league.lClass, japanese, national: false });
    }

    await new Promise(r => setTimeout(r, 800)); // レート制限対策
  }

  allMatches.sort((a, b) => a.kickoffUTC.localeCompare(b.kickoffUTC));

  const jstStr = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString().replace('T', ' ').slice(0, 16);

  if (!fs.existsSync('data')) fs.mkdirSync('data');
  fs.writeFileSync('data/matches.json', JSON.stringify({ updatedAt: jstStr, matches: allMatches }, null, 2));
  console.log(`✅ 保存完了: ${allMatches.length}試合`);
}

main().catch(err => { console.error(err); process.exit(1); });
