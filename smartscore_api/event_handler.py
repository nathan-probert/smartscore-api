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
    return {"statusCode": 200, "entries": dumps(response)}

  elif method == AvailableMethods.POST_BATCH:
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

  elif method == AvailableMethods.GET_DATES_NO_SCORED:
    logger.info("Received GET_DATES_NO_SCORED request")
    response = get_dates_no_scored()
    logger.info(f"Found [{len(response)}] entries for dates with no scores")
    return {"statusCode": 200, "body": {"dates": dumps(response)}}

  elif method == AvailableMethods.POST_BACKFILL:
    response = backfill_dates(event.get("data", {}))
    return {"statusCode": 200, "body": {"num_backfilled": dumps(response)}}

  elif method == AvailableMethods.DELETE_ALL:
    response = delete_all_entries()
    return {"statusCode": 200, "body": {"num_deleted": dumps(response)}}

  elif method == AvailableMethods.GET_MIN_MAX:
    response = get_min_max()
    return {"statusCode": 200, "body": response}

  elif method == AvailableMethods.GET_DATE:
    response = get_entries_from_date(event.get("date"))
    return {"statusCode": 200, "body": json.dumps(response)}

  elif method == AvailableMethods.DELETE_DATE:
    response = delete_entries_from_date(event.get("date"))
    return {"statusCode": 200, "body": {"num_deleted": dumps(response)}}
