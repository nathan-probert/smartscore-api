def abbrev_to_name(abbrev) -> str:
    map = {
        "ANA": "Anaheim",
        "BOSS": "Boston",
        "BUF": "Buffalo",
        "CAR": "Carolina",
        "CBJ": "Columbus",
        "CGY": "Calgary",
        "CHI": "Chicago",
        "COL": "Colorado",
        "DAL": "Dallas",
        "DET": "Detroit",
        "EDM": "Edmonton",
        "FLA": "Florida",
        "LAK": "Los Angeles",
        "MIN": "Minnesota",
        "MTL": "Montreal",
        "NJD": "New Jersey",
        "NSH": "Nashville",
        "NYI": "NY Islanders",
    }
    return


def name_to_abbrev(name) -> str:
    map = {
        "Anaheim": "ANA",
        "Boston": "BOSS",
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
        "New Jersey": "NJD",
        "Nashville": "NSH",
        "Ottawa": "OTT",
        "Philadelphia": "PHI",
        "Pittsburgh": "PIT",
        "Seattle": "SEA",
        "San Jose": "SJS",
        "St Louis": "STL",
        "Winnipeg": "WPG",
        "Tampa Bay": "TBL",
        "Toronto": "TOR",
        "Utah": "UTA",
        "Vancouver": "VAN",
        "Vegas": "VGK",
        "Washington": "WSH",
    }
    abbrev = map.get(name)
    if not abbrev:
        # which new york is this :(
        pass
    return


from smartscore_api.config import collection


