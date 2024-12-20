from config import collection
from smartscore_info_client.schemas.player_info import PlayerInfo, PLAYER_INFO_SCHEMA
from smartscore_info_client.schemas.team_info import TeamInfo, TEAM_INFO_SCHEMA
from aws_lambda_powertools import Logger
import pytz
import datetime


logger = Logger()


def get_date():
  toronto_tz = pytz.timezone("America/Toronto")
  return datetime.datetime.now(toronto_tz).strftime("%Y-%m-%d")


def get_all_entries():
  entries = list(collection.find())
  return entries


def save_batch(event):
  date = event.get("date")
  logger.info(f"Saving batch for date: {date}")
  if get_entries_from_date(date):
    logger.info(f"Entries already exist for date: {date}")
    return []

  players = [PlayerInfo(**player) for player in event.get("players")]
  teams = [TeamInfo(**team) for team in event.get("teams")]

  data = []
  team_data = {team.team_id: TEAM_INFO_SCHEMA.dump(team) for team in teams}

  for player in players:
    team_info = team_data[player.team_id]

    team_info_filtered = {
      key: value
      for key, value in team_info.items()
      if key not in ("team_id", "opponent_id", "season", "team_abbr")
    }
    player_data = PLAYER_INFO_SCHEMA.dump(player)
    player_info_filtered = {
      key: value
      for key, value in player_data.items()
      if key not in ("team_id", "odds", "stat", "tims")
    }

    data.append(
      {"date": date, "scored": None, **player_info_filtered, **team_info_filtered}
    )

  if not data:
    logger.info("No items to save.")
    return []

  result = collection.insert_many(data)
  logger.info(f"result: {result}")
  return result


def delete_all_entries():
  result = collection.delete_many({})
  print(f"Deleted {result.deleted_count} entries.")
  return result.deleted_count


def get_dates_no_scored():
  dates = collection.distinct("date", {"scored": None})
  return dates


def backfill_dates(scorer_dict):
  for date, scorers in scorer_dict.items():
    collection.update_many(
      {"date": date, "id": {"$in": scorers}}, {"$set": {"scored": True}}
    )

    collection.update_many(
      {"date": date, "id": {"$nin": scorers}}, {"$set": {"scored": False}}
    )

  return len(scorer_dict)


def get_min_max():
  stats = {}

  min_gpg = collection.find_one(sort=[("gpg", 1)])["gpg"]
  max_gpg = collection.find_one(sort=[("gpg", -1)])["gpg"]
  stats["gpg"] = {"min": min_gpg, "max": max_gpg}

  min_hgpg = collection.find_one(sort=[("hgpg", 1)])["hgpg"]
  max_hgpg = collection.find_one(sort=[("hgpg", -1)])["hgpg"]
  stats["hgpg"] = {"min": min_hgpg, "max": max_hgpg}

  min_five_gpg = collection.find_one(sort=[("five_gpg", 1)])["five_gpg"]
  max_five_gpg = collection.find_one(sort=[("five_gpg", -1)])["five_gpg"]
  stats["five_gpg"] = {"min": min_five_gpg, "max": max_five_gpg}

  min_tgpg = collection.find_one(sort=[("tgpg", 1)])["tgpg"]
  max_tgpg = collection.find_one(sort=[("tgpg", -1)])["tgpg"]
  stats["tgpg"] = {"min": min_tgpg, "max": max_tgpg}

  min_otga = collection.find_one(sort=[("otga", 1)])["otga"]
  max_otga = collection.find_one(sort=[("otga", -1)])["otga"]
  stats["otga"] = {"min": min_otga, "max": max_otga}

  return stats


def get_entries_from_date(date):
  # Find entries with the given date, excluding the _id field
  entries = list(collection.find({"date": date}, {"_id": 0}))
  return entries


def delete_entries_from_date(date):
  result = collection.delete_many({"date": date})
  return result.deleted_count
