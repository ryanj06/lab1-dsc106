"""Aggregate the NBA Games Dataset into season-level league shooting trends.

Source: nathanlauga/nba-games (Kaggle) -> games.csv, games_details.csv
Run from the repo root with the raw CSVs in ./archive/ :

    python3 final/build_data.py

Outputs final/season_shooting.csv. The same numbers are inlined in main.js
so the page needs no runtime fetch.
"""
import pandas as pd

ARCHIVE = "archive"

games = pd.read_csv(f"{ARCHIVE}/games.csv", usecols=["GAME_ID", "SEASON"])
season_of = dict(zip(games.GAME_ID, games.SEASON))

det = pd.read_csv(
    f"{ARCHIVE}/games_details.csv",
    usecols=["GAME_ID", "TEAM_ID", "FGA", "FG3A", "FTA", "PTS"],
)
det["SEASON"] = det.GAME_ID.map(season_of)
det = det.dropna(subset=["SEASON"])
det["SEASON"] = det.SEASON.astype(int)

# one "team-game" = one team appearing in one game
team_games = (
    det[["SEASON", "GAME_ID", "TEAM_ID"]]
    .drop_duplicates()
    .groupby("SEASON")
    .size()
)

agg = det.groupby("SEASON").agg(
    FGA=("FGA", "sum"),
    FG3A=("FG3A", "sum"),
    FTA=("FTA", "sum"),
    PTS=("PTS", "sum"),
)
agg["team_games"] = team_games
agg["threePApg"] = (agg.FG3A / agg.team_games).round(1)   # 3PA per team per game
agg["threePAR"] = (100 * agg.FG3A / agg.FGA).round(1)     # 3PA share of FGA (%)
agg["ptsPerFGA"] = (agg.PTS / agg.FGA).round(3)           # scoring efficiency

# drop seasons with partial data (e.g. 2022 is mid-season in the source dump)
out = agg[agg.team_games > 2000].reset_index()
out = out[["SEASON", "threePApg", "threePAR", "ptsPerFGA"]]
out.to_csv("final/season_shooting.csv", index=False)
print(out.to_string(index=False))
