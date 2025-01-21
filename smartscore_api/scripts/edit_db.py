# to be ran from the smartscore_api directory
# python scripts/edit_db.py


from smartscore_api.config import collection


# Update document where id is 8482116
collection.update_many(
  {"id": 8482116},  # Match the document with id 8482116
  {
    "$set": {"name": "Tim Stützle"}  # Set the name field to 'Tim Stützle'
  },
)
print("Updated name to 'Tim Stützle' for the entry with id 8481058.")


# Update document where id is 8481058
collection.update_many(
  {"id": 8481058},  # Match the document with id 8481058
  {
    "$set": {"name": "Jesse Ylönen"}  # Set the name field to 'Jesse Ylönen'
  },
)
print("Updated name to 'Jesse Ylönen' for the entry with id 8481058.")


# Update document where id is 8475825
collection.update_many(
  {"id": 8475825},  # Match the document with id 8475825
  {
    "$set": {"name": "Jani Hakanpää"}  # Set the name field to 'Jani Hakanpää'
  },
)
print("Updated name to 'Jani Hakanpää' for the entry with id 8475825.")


# Update document where id is 8482109
collection.update_many(
  {"id": 8482109},  # Match the document with id 8482109
  {
    "$set": {"name": "Alexis Lafrenière"}  # Set the name field to 'Alexis Lafrenière'
  },
)
print("Updated name to 'Alexis Lafrenière' for the entry with id 8482109.")


collection.delete_many({"date": "2024-10-25"})
