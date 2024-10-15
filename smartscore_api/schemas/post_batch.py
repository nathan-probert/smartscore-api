from dataclasses import dataclass
from typing import List
from marshmallow import Schema, fields
from smartscore_info_client.schemas.team_info import TeamInfo, TEAM_INFO_SCHEMA
from smartscore_info_client.schemas.player_info import PlayerInfo, PLAYER_INFO_SCHEMA


@dataclass(frozen=True)
class SaveBatch:
  date: str
  teams: List[TeamInfo]
  players: List[PlayerInfo]


class SaveBatchSchema(Schema):
  date = fields.Str(required=True)
  teams = fields.List(fields.Nested(TEAM_INFO_SCHEMA), required=True)
  players = fields.List(fields.Nested(PLAYER_INFO_SCHEMA), required=True)


SAVE_BATCH_SCHEMA = SaveBatchSchema()
