# to be ran from the smartscore_api directory
# python scripts/sync_mongo_to_local.py

import base64
import gzip
import json
import csv

import sys

sys.path.append("./smartscore_api")

from event_handler import handle_request
from smartscore_info_client.schemas.player_info import PlayerInfo


def get_players() -> list[PlayerInfo]:
  payload = {"method": "GET_ALL"}
  response = handle_request(payload, None)
  data = unpack_response(response.get("entries"))
  players = [PlayerInfo(**player) for player in data]
  return players


def unpack_response(body):
    compressed_data = base64.b64decode(body)
    decompressed_data = gzip.decompress(compressed_data).decode("utf-8")
    original_data = json.loads(decompressed_data)

    return original_data


# write all fields to csv
def write_csv(players: list[PlayerInfo]):
  with open("lib/data.csv", "w", newline="", encoding="utf-8") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(["date", "name", "scored", "id", "gpg", "hgpg", "five_gpg", "hppg", "tgpg", "otga", "otshga", "home", "tims"])
    for player in players:
      writer.writerow(
        [
          player.date,
          player.name,
          player.scored,
          player.id,
          player.gpg,
          player.hgpg,
          player.five_gpg,
          player.hppg,
          player.tgpg,
          player.otga,
          player.otshga,
          player.is_home,
          player.tims,
        ]
      )


if __name__ == "__main__":
  players = get_players()
  write_csv(players)
