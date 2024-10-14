from smartscore_api.config import collection  # Import the collection from config.py

# Define the list of specific dates to match
date_list = ["2024-10-10", "2024-10-11", "2024-10-12", "2024-10-13"]

# Update all documents where scored is 0 or 1 and date is in the specified date list, setting scored to None
collection.update_many(
    {
        "date": {"$in": date_list}
    },
    {"$set": {"scored": None}}
)

print("Set all scored fields to None for the specified dates.")
