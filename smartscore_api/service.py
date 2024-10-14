from config import collection
from smartscore_info_client.schemas.player_info import PlayerInfo, PLAYER_INFO_SCHEMA
from smartscore_info_client.schemas.team_info import TeamInfo, TEAM_INFO_SCHEMA
from aws_lambda_powertools import Logger


logger = Logger()

def get_all_entries():
    entries = list(collection.find())
    return entries


def save_batch(event):
    date = event.get("date")
    logger.info(f"Saving batch for date: {date}")
    players = [PlayerInfo(**player) for player in event.get("players")]
    teams = [TeamInfo(**team) for team in event.get("teams")]

    data = []
    team_data = {team.team_id: TEAM_INFO_SCHEMA.dump(team) for team in teams}

    for player in players:
        team_info = team_data[player.team_id]

        team_info_filtered = {
            key: value for key, value in team_info.items()
            if key not in ('team_id', 'opponent_id', 'season', 'team_abbr', 'tims', 'odds', 'stat')
        }
        player_data = PLAYER_INFO_SCHEMA.dump(player)

        data.append({
            "date": date,
            "scored": None,
            **player_data,
            **team_info_filtered
        })


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
            {"date": date, "id": {"$in": scorers}},
            {"$set": {"scored": True}}
        )

        collection.update_many(
            {"date": date, "id": {"$nin": scorers}},
            {"$set": {"scored": False}}
        )

    return len(scorer_dict)
