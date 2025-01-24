import json

from service import (
  get_all_entries,
  save_batch,
  delete_all_entries,
  get_dates_no_scored,
  backfill_dates,
  get_min_max,
  get_entries_from_date,
  delete_entries_from_date,
  delete_game,
)
from aws_lambda_powertools import Logger
from bson.json_util import dumps
from decorators import lambda_handler_error_responder
from schemas.method import AvailableMethods

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
    save_batch(event)
    return {
      "statusCode": 200,
      "players": dumps(event.get("players")),
    }

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
