from smartscore_api.config import collection  # Import the collection from config.py
# Assuming collection is already defined as the MongoDB collection

# MongoDB query to remove the specified fields from all documents
collection.update_many(
  {},  # Empty filter to target all documents
  {
    "$unset": {"odds": "", "tims": "", "stat": "", "team_id": ""}
  },  # Unset the specified fields
)

print("Attributes 'odds', 'tims', and 'stat' removed from all documents.")
