import sys

from pymongo import MongoClient
from dotenv import load_dotenv
import os
from aws_lambda_powertools import Logger


logger = Logger()

load_dotenv()

_MONGO_TOKEN = os.getenv("MONGO_URI")
if not _MONGO_TOKEN:
  logger.error("MONGO_URI not found in environment variables")
  sys.exit(1)
_client = MongoClient(_MONGO_TOKEN)
collection = _client.get_database("players").get_collection("SmartScore")
