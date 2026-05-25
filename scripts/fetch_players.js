// scripts/fetch_players.js
// football-data.org から日本人選手マップを取得し data/players.json に保存（月1実行想定）
// 実行: FOOTBALLDATA_KEY=xxx node scripts/fetch_players.js
// 強制更新: FOOTBALLDATA_KEY=xxx FORCE_UPDATE=1 node scripts/fetch_players.js

'use strict';
const fs = require('fs');

const FOOTBALLDATA_KEY = process.env.FOOTBALLDATA_KEY;
const FORCE_UPDATE     = process.env.FORCE_UPDATE === '1';

if (!FOOTBALLDATA_KEY) {
  console.error('❌ 環境変数 FOOTBALLDATA_KEY が未設定');
  process.exit(1);
}

const TARGET_COMPETITIONS = [
  { id: 2021, name: 'EPL'              },
  { id: 2014, name: 'LaLiga'           },
  { id: 2002, name: 'Bundesliga'       },
  { id: 2019, name: 'Serie A'          },
  { id: 2015, name: 'Ligue 1'          },
  { id: 2003, name: 'Eredivisie'       },
  { id: 2017, name: 'Liga Portugal'    },
  { id: 2016, name: 'Championship'     },
  { id: 2001, name: 'Champions League' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fdFetch(path, retries = 3) {
  const url = `https://api.football-data.org/v4${path}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'X-Auth-Token': FOOTBALLDATA_KEY },
      });
      if (res.status === 429) {
        const wait = attempt * 20000;
        console.warn(`  ⏳ 429 Too Many Requests. ${wait/1000}秒待機...`);
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

async function fetchJapaneseByCompetition(compId) {
  const data = await fdFetch(`/competitions/${compId}/teams`);
  if (!data?.teams) return {};

  const result = {};
  for (const team of data.teams) {
    const japanese = (team.squad || [])
      .filter(p => p.nationality === 'Japan')
      .map(p => p.name || '')
      .filter(Boolean);

    if (japanese.length > 0) {
      // name / shortName / tla の全バリエーションをキーとして登録
      // → fetch_matches.js 側でどの名前が来てもヒットするようにする
      if (team.name)      result[team.name]      = japanese;
      if (team.shortName) result[team.shortName] = japanese;
      if (team.tla)       result[team.tla]       = japanese;
    }
  }
  return result;
}

async function main() {
  if (!fs.existsSync('data')) fs.mkdirSync('data');

  const CACHE_PATH = 'data/players.json';

  if (!FORCE_UPDATE && fs.existsSync(CACHE_PATH)) {
    const cached = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    // players は { teamName: [playerNames] } 形式
    // キーにはname/shortName/tlaが含まれるため、ユニークな選手数でカウント
    const uniquePlayers = new Set(Object.values(cached.players || {}).flat());
    console.log(`\n📋 選手データキャッシュ読み込み: ${Object.keys(cached.players || {}).length}キー / ${uniquePlayers.size}人 (更新: ${cached.updatedAt})`);
    console.log('💡 強制更新する場合は FORCE_UPDATE=1 を付けて実行してください。');
    return;
  }

  if (FORCE_UPDATE) console.log('\n🔄 FORCE_UPDATE=1: キャッシュを無視して取得します。');

  console.log(`\n👥 日本人選手データ取得 (${TARGET_COMPETITIONS.length}リーグ)...\n`);

  const playerMap = {};

  for (let i = 0; i < TARGET_COMPETITIONS.length; i++) {
    const comp = TARGET_COMPETITIONS[i];
    process.stdout.write(`[${String(i+1).padStart(2)}/${TARGET_COMPETITIONS.length}] ${comp.name.padEnd(22)} `);

    const result = await fetchJapaneseByCompetition(comp.id);
    const teams  = Object.keys(result);

    if (teams.length > 0) {
      Object.assign(playerMap, result);
      // ログはname（最初のキー）で代表表示
      const displayed = new Set();
      const names = [];
      for (const [key, players] of Object.entries(result)) {
        const sig = players.join(',');
        if (!displayed.has(sig)) {
          names.push(`${key}: ${players.join(', ')}`);
          displayed.add(sig);
        }
      }
      console.log(`✅ ${names.join(' / ')}`);
    } else {
      console.log('－ 日本人選手なし');
    }

    if (i < TARGET_COMPETITIONS.length - 1) await sleep(7000);
  }

  const jstStr = new Date(Date.now() + 9*60*60*1000)
    .toISOString().replace('T', ' ').slice(0, 16);
  fs.writeFileSync(CACHE_PATH, JSON.stringify({
    updatedAt: jstStr,
    players: playerMap,
  }, null, 2));

  const uniquePlayers = new Set(Object.values(playerMap).flat());
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 保存完了: ${Object.keys(playerMap).length}キー / ${uniquePlayers.size}人`);

  // ユニークなチームだけログ表示（重複エントリは除く）
  const displayed = new Set();
  for (const [key, players] of Object.entries(playerMap)) {
    const sig = players.join(',');
    if (!displayed.has(sig)) {
      console.log(`   ${key}: ${players.join(', ')}`);
      displayed.add(sig);
    }
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(err => { console.error(err); process.exit(1); });
