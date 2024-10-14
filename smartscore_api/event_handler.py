from service import (
  get_all_entries,
  save_batch,
  delete_all_entries,
  get_dates_no_scored,
  backfill_dates,
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
    return {"statusCode": 500, "body": f"Method not defined"}
  event.pop("statusCode", None)

  if method == AvailableMethods.GET_ALL:
    response = get_all_entries()
    return {"statusCode": 200, "entries": dumps(response)}

  elif method == AvailableMethods.POST_BATCH:
    num_entries = len(event["players"])
    logger.info(f"Received POST_BATCH request for [{num_entries}] entries")

    errors = SAVE_BATCH_SCHEMA.validate(event)
    if errors:
      logger.error(f"Validation failed: {errors}")
      raise ValueError(f"Validation failed: {errors}")

    validated_data = SAVE_BATCH_SCHEMA.load(event)

    logger.info(f"Validated data, calling mongo now...")
    save_batch(validated_data)
    return {"statusCode": 200}

  elif method == AvailableMethods.GET_DATES_NO_SCORED:
    response = get_dates_no_scored()
    return {"statusCode": 200, "body": {"dates": dumps(response)}}

  elif method == AvailableMethods.POST_BACKFILL:
    response = backfill_dates(event.get('data', {}))
    return {"statusCode": 200, "body": {"num_backfilled": dumps(response)}}

  elif method == AvailableMethods.DELETE_ALL:
    response = delete_all_entries()
    return {"statusCode": 200, "body": {"num_deleted": dumps(response)}}


if __name__ == "__main__":
  event = {
    "statusCode": 200,
    "method": "GET_DATES_NO_SCORED"
  }
  # event = {
  #   "statusCode": 200,
  #   "method": "DELETE_DATE",
  #   "date": "2024-10-13"
  # }
  # event = {
  #   "statusCode": 200,
  #   "method": AvailableMethods.POST_BATCH,
  #   "date": "2024-10-10",
  #   "teams": [{'name': 'Philadelphia', 'abbr': 'PHI', 'season': '20242025', 'id': 4, 'opponent_id': 1, 'tgpg': 2.81707, 'otga': 3.42682}, {'name': 'New Jersey', 'abbr': 'NJD', 'season': '20242025', 'id': 1, 'opponent_id': 4, 'tgpg': 3.21951, 'otga': 3.14634}, {'name': 'Columbus', 'abbr': 'CBJ', 'season': '20242025', 'id': 29, 'opponent_id': 5, 'tgpg': 2.85365, 'otga': 3.02439}, {'name': 'Pittsburgh', 'abbr': 'PIT', 'season': '20242025', 'id': 5, 'opponent_id': 29, 'tgpg': 3.08536, 'otga': 3.63414}, {'name': 'Detroit', 'abbr': 'DET', 'season': '20242025', 'id': 17, 'opponent_id': 10, 'tgpg': 3.35365, 'otga': 3.18292}, {'name': 'Toronto', 'abbr': 'TOR', 'season': '20242025', 'id': 10, 'opponent_id': 17, 'tgpg': 3.63414, 'otga': 3.32926}, {'name': 'Los Angeles', 'abbr': 'LAK', 'season': '20242025', 'id': 26, 'opponent_id': 6, 'tgpg': 3.09756, 'otga': 2.69512}, {'name': 'Boston', 'abbr': 'BOS', 'season': '20242025', 'id': 6, 'opponent_id': 26, 'tgpg': 3.20731, 'otga': 2.56097}, {'name': 'St. Louis', 'abbr': 'STL', 'season': '20242025', 'id': 19, 'opponent_id': 25, 'tgpg': 2.85365, 'otga': 2.82926}, {'name': 'Dallas', 'abbr': 'DAL', 'season': '20242025', 'id': 25, 'opponent_id': 19, 'tgpg': 3.58536, 'otga': 3.02439}, {'name': 'Vegas', 'abbr': 'VGK', 'season': '20242025', 'id': 54, 'opponent_id': 21, 'tgpg': 3.20731, 'otga': 3.07317}, {'name': 'Colorado', 'abbr': 'COL', 'season': '20242025', 'id': 21, 'opponent_id': 54, 'tgpg': 3.68292, 'otga': 2.96341}],
  #   "players":  [{'name': 'Rodrigo Abols', 'id': 8479022, 'team_id': 4, 'gpg': 0.0, 'hgpg': 0.0, 'five_gpg': 0.0, 'stat': 0.030485007911920547}, {'name': 'Jon-Randall Avon', 'id': 8483010, 'team_id': 4, 'gpg': 0.0, 'hgpg': 0.0, 'five_gpg': 0.0, 'stat': 0.030485007911920547}, {'name': 'Denver Barkey', 'id': 8484142, 'team_id': 4, 'gpg': 0.0, 'hgpg': 0.0, 'five_gpg': 0.0, 'stat': 0.030485007911920547}, {'name': 'Bobby Brink', 'id': 8481553, 'team_id': 4, 'gpg': 0.19298245614035087, 'hgpg': 0.16417910447761194, 'five_gpg': 0.2, 'stat': 0.12767799198627472}, {'name': 'Noah Cates', 'id': 8480220, 'team_id': 4, 'gpg': 0.1016949152542373, 'hgpg': 0.15286624203821655, 'five_gpg': 0.2, 'stat': 0.09116297215223312}, {'name': 'Sean Couturier', 'id': 8476461, 'team_id': 4, 'gpg': 0.14864864864864866, 'hgpg': 0.1650485436893204, 'five_gpg': 0.0, 'stat': 0.08994446694850922}, {'name': 'Nicolas Deslauriers', 'id': 8475235, 'team_id': 4, 'gpg': 0.016666666666666666, 'hgpg': 0.06637168141592921, 'five_gpg': 0.2, 'stat': 0.0571516752243042}, {'name': 'Elliot Desnoyers', 'id': 8482452, 'team_id': 4, 'gpg': 0.0, 'hgpg': 0.0, 'five_gpg': 0.0, 'stat': 0.030485007911920547}]
  # }
  # event = {
  #   "statusCode": 200,
  #   "method": "DELETE_ALL"
  # }
  # event = {
  #   "statusCode": 200,
  #   "method": "POST_BACKFILL",
  #   "data": {'2024-10-11': [8478010, 8476453, 8473533, 8477987, 8476460, 8481546, 8482159, 8481535, 8480028, 8476927, 8478403, 8477447, 8477964, 8480023, 8477402, 8478462], '2024-10-12': [8477496, 8479675, 8477956, 8480035, 8477220, 8480807, 8478413, 8477935, 8479420, 8477949, 8482720, 8476483, 8471724, 8478483, 8477939, 8481618, 8482476, 8481540, 8482116, 8477456, 8477946, 8477429, 8482699, 8482157, 8479343, 8478831, 8480849, 8480817, 8478550, 8480855, 8482073, 8482110, 8483429, 8481032, 8478440, 8476880, 8475193, 8474590, 8475794, 8473994, 8477955, 8477451, 8475692, 8478864, 8481557, 8474586, 8481789, 8482660, 8479525, 8484166, 8482475, 8477425, 8477492, 8477497, 8478460, 8480893, 8479999, 8477346, 8475172, 8474150, 8478439, 8476456, 8480797, 8477934, 8484144, 8476882, 8477495, 8470621, 8480798, 8481533, 8480806]}
  # }

  print(handle_request(event, {}))
