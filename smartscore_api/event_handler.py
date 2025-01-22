import json

from smartscore_info_client.schemas.player_info import PlayerInfo, PLAYER_INFO_SCHEMA
from smartscore_info_client.schemas.team_info import TeamInfo, TEAM_INFO_SCHEMA
from service import (
  get_all_entries,
  save_batch,
  delete_all_entries,
  get_dates_no_scored,
  backfill_dates,
  get_min_max,
  get_date,
  get_entries_from_date,
  delete_entries_from_date,
  delete_game,
)
from aws_lambda_powertools import Logger
from bson.json_util import dumps
from decorators import lambda_handler_error_responder
from schemas.method import AvailableMethods
from schemas.post_batch import SAVE_BATCH_SCHEMA

logger = Logger()


@lambda_handler_error_responder
def handle_request(event, context):
  if not (method := AvailableMethods(event.pop("method"))):
    return {"statusCode": 500, "body": "Method not defined"}

  event.pop("statusCode", None)

  if method == AvailableMethods.GET_ALL:
    response = get_all_entries()
    return {
      "statusCode": 200,
      "entries": dumps(response),
      "isBase64Encoded": True,
      "headers": {
        "Content-Encoding": "gzip",
        "Content-Type": "application/json",
      },
    }

  if method == AvailableMethods.POST_BATCH:
    if event.get("teams"):
      all_players = [
        PlayerInfo(**player)
        for team in event.get("teams")
        for player in team.pop("players")
      ]
      all_teams = [TeamInfo(**team) for team in event.get("teams")]

      num_entries = len(all_players)
      logger.info(f"Received POST_BATCH request for [{num_entries}] entries")

      event = {
        "date": get_date(),
        "teams": TEAM_INFO_SCHEMA.dump(all_teams, many=True),
        "players": PLAYER_INFO_SCHEMA.dump(all_players, many=True),
      }

      errors = SAVE_BATCH_SCHEMA.validate(event)
      if errors:
        logger.error(f"Validation failed: {errors}")
        raise ValueError(f"Validation failed: {errors}")

      validated_data = SAVE_BATCH_SCHEMA.load(event)

      logger.info("Validated data, calling mongo now...")
      save_batch(validated_data)
      return {
        "statusCode": 200,
        "teams": TEAM_INFO_SCHEMA.dump(all_teams, many=True),
        "players": PLAYER_INFO_SCHEMA.dump(all_players, many=True),
      }

    event = {
      "date": get_date(),
      "players": PLAYER_INFO_SCHEMA.load(event.get("players")),
    }
    save_batch(event)
    return {"statusCode": 200, "players": PLAYER_INFO_SCHEMA.dump(event.get("players"), many=True)}

  if method == AvailableMethods.GET_DATES_NO_SCORED:
    response = get_dates_no_scored()
    return {"statusCode": 200, "body": {"dates": dumps(response)}}

  if method == AvailableMethods.POST_BACKFILL:
    response = backfill_dates(event.get("data", {}))
    return {"statusCode": 200, "body": {"num_backfilled": dumps(response)}}

  if method == AvailableMethods.DELETE_ALL:
    response = delete_all_entries()
    return {"statusCode": 200, "body": {"num_deleted": dumps(response)}}

  if method == AvailableMethods.GET_MIN_MAX:
    response = get_min_max()
    return {"statusCode": 200, "body": response}

  if method == AvailableMethods.GET_DATE:
    response = get_entries_from_date(event.get("date"))
    return {"statusCode": 200, "body": json.dumps(response)}

  if method == AvailableMethods.DELETE_DATE:
    response = delete_entries_from_date(event.get("date"))
    return {"statusCode": 200, "body": {"num_deleted": dumps(response)}}

  if method == AvailableMethods.DELETE_GAME:
    response = delete_game(event.get("date"), event.get("home"), event.get("away"))
    return {"statusCode": 200, "body": {"num_deleted": dumps(response)}}
