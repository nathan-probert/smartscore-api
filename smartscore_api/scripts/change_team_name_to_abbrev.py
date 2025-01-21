from smartscore_api.config import collection


def name_to_abbrev(name: str) -> str:
  map = {
    "Arizona": "ARI",
    "Anaheim": "ANA",
    "Boston": "BOS",
    "Buffalo": "BUF",
    "Carolina": "CAR",
    "Columbus": "CBJ",
    "Calgary": "CGY",
    "Chicago": "CHI",
    "Colorado": "COL",
    "Dallas": "DAL",
    "Detroit": "DET",
    "Edmonton": "EDM",
    "Florida": "FLA",
    "Los Angeles": "LAK",
    "Minnesota": "MIN",
    "Montreal": "MTL",
    "Montréal": "MTL",
    "New Jersey": "NJD",
    "Nashville": "NSH",
    "Ottawa": "OTT",
    "Philadelphia": "PHI",
    "Pittsburgh": "PIT",
    "Seattle": "SEA",
    "San Jose": "SJS",
    "St Louis": "STL",
    "St. Louis": "STL",
    "Winnipeg": "WPG",
    "Tampa Bay": "TBL",
    "Toronto": "TOR",
    "Utah": "UTA",
    "Vancouver": "VAN",
    "Vegas": "VGK",
    "Washington": "WSH",
    "Islanders": "NYI",
    "Rangers": "NYR",
  }
  return map.get(name.strip())


def update_team_names():
  dates = {}
  dates_done = {}

  count = 0
  skipped = 0
  cursor = collection.find()

  for doc in cursor:
    if count % 100 == 0 and count != 0:
      print(f"Processed {count} players.")
    if skipped % 100 == 0 and skipped != 0:
      print(f"Skipped {skipped} players.")

    team_name = doc.get("team_name")
    player_name = doc.get("name")
    date = doc.get("date")
    tgpg = doc.get("tgpg")
    otga = doc.get("otga")

    # team_name is already an abbreviation, skip
    if not team_name:
      skipped += 1
      continue

    if team_name == "New York":
      selected_team = dates.get((date, tgpg, otga))
      if not selected_team:
        # check if same day, because then it must be the other team
        played_today = dates_done.get(doc.get("date"))
        if played_today and played_today == "Islanders":
          selected_team = "Rangers"
        elif played_today and played_today == "Rangers":
          selected_team = "Islanders"

        else:
          print(f"Player: {player_name}, Team: {team_name}, Date: {doc.get('date')}")
          choice = (
            input("Is this player on the Islanders (i) or Rangers (r)? ")
            .strip()
            .lower()
          )
          if choice == "i":
            selected_team = "Islanders"

          elif choice == "r":
            selected_team = "Rangers"

          else:
            print("Invalid choice. Skipping...")
            continue

          print(f"Selected: {selected_team}")
          dates[(doc.get("date"), tgpg, otga)] = selected_team
          dates_done[doc.get("date")] = selected_team
    else:
      selected_team = team_name

    abbrev = name_to_abbrev(selected_team)
    if not abbrev:
      print(f"Could not find abbreviation for team: {selected_team}")
      print(doc)
      exit()

    collection.update_one(
      {"_id": doc["_id"]},
      {"$set": {"team_abbr": abbrev}, "$unset": {"team_name": ""}}
    )
    count += 1


if __name__ == "__main__":
  update_team_names()
