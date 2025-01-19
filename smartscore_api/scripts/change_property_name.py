from smartscore_api.config import collection


original_property = "team_abbrev"
new_property = "team_abbr"

result = collection.update_many(
    {original_property: {"$exists": True}},  # Only target documents where property exists
    {"$rename": {original_property: new_property}}
)

# Print the result of the update operation
print(f"Matched {result.matched_count} documents.")
print(f"Modified {result.modified_count} documents.")