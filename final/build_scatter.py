"""
Run this from the root of your repo:
    python3 final/build_scatter.py

Reads archive/games.csv and outputs final/scatter_data.json
A small file (~5KB) with team-season win% vs 3PA rate for the scatter plot.
"""
import csv, json, collections

TEAM_NAMES = {
    '1610612737': 'ATL', '1610612738': 'BOS', '1610612739': 'CLE',
    '1610612740': 'GSW', '1610612741': 'CHI', '1610612742': 'DAL',
    '1610612743': 'DEN', '1610612744': 'GSW', '1610612745': 'HOU',
    '1610612746': 'LAC', '1610612747': 'LAL', '1610612748': 'MIA',
    '1610612749': 'MIL', '1610612750': 'MIN', '1610612751': 'BKN',
    '1610612752': 'NYK', '1610612753': 'ORL', '1610612754': 'IND',
    '1610612755': 'PHI', '1610612756': 'PHX', '1610612757': 'POR',
    '1610612758': 'SAC', '1610612759': 'SAS', '1610612760': 'OKC',
    '1610612761': 'TOR', '1610612762': 'UTA', '1610612763': 'MEM',
    '1610612764': 'WAS', '1610612765': 'DET', '1610612766': 'CHA',
}

team_season = collections.defaultdict(lambda: {
    'fg3_sum': 0, 'wins': 0, 'games': 0, 'team': ''
})

with open('archive/games.csv', newline='') as f:
    reader = csv.DictReader(f)
    for r in reader:
        s = r.get('SEASON', '')
        if not s or not (2003 <= int(s) <= 2021):
            continue
        try:
            home_id = r['TEAM_ID_home']
            away_id = r['VISITOR_TEAM_ID']
            hw      = int(r['HOME_TEAM_WINS'])
            hfg3    = float(r['FG3_PCT_home']) if r['FG3_PCT_home'] else None
            afg3    = float(r['FG3_PCT_away']) if r['FG3_PCT_away'] else None

            if hfg3 is not None:
                key = (home_id, s)
                team_season[key]['fg3_sum'] += hfg3
                team_season[key]['wins']    += hw
                team_season[key]['games']   += 1
                team_season[key]['team']     = TEAM_NAMES.get(home_id, home_id)

            if afg3 is not None:
                key = (away_id, s)
                team_season[key]['fg3_sum'] += afg3
                team_season[key]['wins']    += (1 - hw)
                team_season[key]['games']   += 1
                team_season[key]['team']     = TEAM_NAMES.get(away_id, away_id)
        except (ValueError, KeyError):
            continue

results = []
for (tid, s), v in team_season.items():
    if v['games'] < 30:
        continue
    results.append({
        'season': int(s),
        'team':   v['team'],
        'fg3pct': round(v['fg3_sum'] / v['games'], 3),
        'winpct': round(v['wins']    / v['games'], 3),
    })

results.sort(key=lambda x: (x['season'], x['team']))

with open('final/scatter_data.json', 'w') as f:
    json.dump(results, f)

print(f"Done — {len(results)} team-season rows written to final/scatter_data.json")
