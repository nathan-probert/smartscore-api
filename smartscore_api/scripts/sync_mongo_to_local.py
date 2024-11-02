# to be ran from the smartscore_api directory
# python scripts/sync_mongo_to_local.py

import json
import csv

import sys
sys.path.append('../smartscore_api')

from event_handler import handle_request
from smartscore_info_client.schemas.player_info import PlayerDbInfo


def get_players() -> list[PlayerDbInfo]:
    payload = {
        "method": "GET_ALL"
    }
    response = handle_request(payload, None)
    players_json = json.loads(response.get("entries"))
    players = [PlayerDbInfo(**player) for player in players_json]
    return players


def write_csv(players: list[PlayerDbInfo]):
    # Create the player table with composite (id, date) keys
    player_table = {(player.id, player.date): player for player in players}

    # Read the existing CSV file
    with open("../lib/data.csv", "r") as f:
        lines = list(csv.reader(f))
        existing_dates = {line[0] for line in lines}

    # Open the file in write mode to update the 'scored' values
    with open("../lib/data.csv", "w", newline='') as f:
        writer = csv.writer(f)

        # Loop through each line, update scored if needed, and write it back
        for line in lines:
            scored = line[1]

            if not scored or scored == " " or scored == "null":
                # Extract the (id, date) key from the CSV line
                key = (int(line[3]), line[0])

                # Find the 'scored' value from the player_table
                player = player_table.get(key)

                if player is not None:
                    # Update the 'scored' part of the line
                    line[1] = int(player.scored)

            # Write the (possibly updated) line back to the CSV
            writer.writerow(line)

    with open("../lib/data.csv", "a", newline="") as f:
        writer = csv.writer(f)

        # Write the new players to the end of the file
        count = 0
        for player in players:
            if player.date not in existing_dates:
                count += 1
                writer.writerow([
                    player.date,
                    int(player.scored) if player.scored else " ",
                    player.name,
                    player.id,
                    player.team_name,
                    -1, #bet
                    player.gpg,
                    player.five_gpg,
                    player.hgpg,
                    -1, #ppg
                    -1, #otpm
                    player.tgpg,
                    player.otga,
                    -1, #home
                ])
        print(f"Wrote {count} new players to data.csv")


if __name__ == "__main__":
    players = get_players()
    write_csv(players)
    