from pymongo import MongoClient
from dotenv import load_dotenv
import os
from aws_lambda_powertools import Logger


logger = Logger()

load_dotenv()

_MONGO_TOKEN = os.getenv("MONGO_URI")
_client = MongoClient(_MONGO_TOKEN)
collection = _client.get_database("players").get_collection("SmartScore")
