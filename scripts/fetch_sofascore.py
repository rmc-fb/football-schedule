"""
Sofascore /scheduled-events/{date} エンドポイントから
指定リーグの試合データを取得して data/ に保存するスクリプト。

GitHub Actions で毎日自動実行される。
403が出た場合は GitHub Actions のログで確認できる。
"""

import json
import time
import sys
from datetime import datetime, timezone, timedelta, date
from pathlib import Path

import requests

# ============================================================
# 設定: 取得したいリーグを追加・削除できます
# uniqueTournament ID は Sofascore の URL から確認
# 例: sofascore.com/football/ecuador/ligapro-serie-a/... → id=240
# ============================================================
LEAGUES = [
    # リーグ名                        uniqueTournament ID
    {"name": "プレミアリーグ",             "id": 17},
    {"name": "ラ・リーガ",               "id": 8},
    {"name": "ブンデスリーガ",             "id": 35},
    {"name": "セリエA",                  "id": 23},
    {"name": "リーグ・アン",              "id": 34},
    {"name": "UCLチャンピオンズリーグ",    "id": 7},
    {"name": "UELヨーロッパリーグ",       "id": 679},
    {"name": "エールディヴィジ",           "id": 37},
    {"name": "ポルトガル・プリメイラ",      "id": 238},
    # 必要に応じて追加してください
    # {"name": "エクアドルLigaPro",       "id": 240},
]

# 取得する日付の範囲（今日から前後何日分）
DAYS_BACK    = 3   # 過去3日（結果取得用）
DAYS_FORWARD = 14  # 未来14日（予定取得用）

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    "Referer": "https://www.sofascore.com/",
    "Origin": "https://www.sofascore.com",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
}

BASE_URL   = "https://www.sofascore.com/api/v1"
OUTPUT_DIR = Path("data")
JST        = timezone(timedelta(hours=9))


def fetch(url: str, retries: int = 3) -> dict | None:
    for attempt in range(retries):
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            if r.status_code == 200:
                return r.json()
            elif r.status_code == 429:
                wait = 30 * (attempt + 1)
                print(f"  ⚠ レートリミット。{wait}秒待機...")
                time.sleep(wait)
            elif r.status_code == 403:
                print(f"  ✗ 403 Forbidden: {url}")
                print("    → VPNを切る / GitHub Actions から実行してください")
                return None
            else:
                print(f"  ✗ HTTP {r.status_code}: {url}")
                return None
        except requests.RequestException as e:
            print(f"  ✗ リクエストエラー (試行 {attempt+1}/{retries}): {e}")
            time.sleep(5)
    return None


def parse_event(event: dict, league_name: str, league_id: int) -> dict:
    home       = event.get("homeTeam", {})
    away       = event.get("awayTeam", {})
    home_score = event.get("homeScore", {})
    away_score = event.get("awayScore", {})
    status     = event.get("status", {})
    ts         = event.get("startTimestamp")

    if ts:
        dt       = datetime.fromtimestamp(ts, tz=JST)
        date_str = dt.strftime("%Y-%m-%d")
        time_str = dt.strftime("%H:%M")
    else:
        date_str = ""
        time_str = ""

    # スコアは終了・進行中のみ表示（未開始は None のまま）
    status_type = status.get("type", "")
    has_score   = status_type in ("finished", "inprogress")

    return {
        "id":            event.get("id"),
        "leagueName":    league_name,
        "leagueId":      league_id,
        "date":          date_str,
        "time":          time_str,
        "timestamp":     ts,
        "homeTeam":      home.get("name", ""),
        "homeTeamShort": home.get("shortName") or home.get("nameCode", ""),
        "homeTeamId":    home.get("id"),
        "awayTeam":      away.get("name", ""),
        "awayTeamShort": away.get("shortName") or away.get("nameCode", ""),
        "awayTeamId":    away.get("id"),
        "homeScore":     home_score.get("current") if has_score else None,
        "awayScore":     away_score.get("current") if has_score else None,
        "status":        status.get("description", ""),
        "statusCode":    status.get("code"),
        # statusCode: 0=未開始, 6=前半, 7=後半, 100=終了
        "finished":      status_type == "finished",
        "inProgress":    status_type == "inprogress",
    }


def fetch_league(league: dict) -> list[dict]:
    """指定リーグの DAYS_BACK〜DAYS_FORWARD 日分の試合を取得"""
    league_id   = league["id"]
    league_name = league["name"]
    today       = date.today()
    all_events  = []
    seen_ids    = set()

    for delta in range(-DAYS_BACK, DAYS_FORWARD + 1):
        d        = today + timedelta(days=delta)
        date_str = d.isoformat()
        url      = f"{BASE_URL}/unique-tournament/{league_id}/scheduled-events/{date_str}"
        data     = fetch(url)

        if data is None:
            # 403 など → これ以上試してもムダなのでループを抜ける
            return all_events

        events = data.get("events", [])
        for e in events:
            eid = e.get("id")
            if eid and eid not in seen_ids:
                seen_ids.add(eid)
                all_events.append(parse_event(e, league_name, league_id))

        time.sleep(1)  # 1秒待機（連打しない）

    return all_events


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    updated_at  = datetime.now(tz=JST).strftime("%Y-%m-%d %H:%M JST")
    all_events  = []
    failed      = []

    for league in LEAGUES:
        print(f"\n取得中: {league['name']} (id={league['id']})")
        events = fetch_league(league)
        print(f"  → {len(events)} 試合")

        if events:
            all_events.extend(events)

            # リーグ別 JSON
            out = OUTPUT_DIR / f"league_{league['id']}.json"
            out.write_text(
                json.dumps(
                    {"leagueName": league["name"], "leagueId": league["id"],
                     "updatedAt": updated_at, "events": events},
                    ensure_ascii=False, indent=2
                ),
                encoding="utf-8",
            )
        else:
            failed.append(league["name"])

    # 全リーグまとめ
    all_events.sort(key=lambda x: x.get("timestamp") or 0)
    total = {
        "updatedAt": updated_at,
        "totalEvents": len(all_events),
        "events": all_events,
    }
    (OUTPUT_DIR / "total.json").write_text(
        json.dumps(total, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"\n✅ 完了: {len(all_events)} 試合を data/total.json に保存")
    print(f"   更新時刻: {updated_at}")

    if failed:
        print(f"\n⚠ 取得失敗リーグ: {', '.join(failed)}")
        print("  403 の場合は GitHub Actions のログを確認してください")
        sys.exit(1)  # Actions でエラーとして検知できるように


if __name__ == "__main__":
    main()
