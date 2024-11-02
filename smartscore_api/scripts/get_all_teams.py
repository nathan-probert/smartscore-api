from smartscore_api.config import collection

# Get unique team names from the collection
unique_team_names = collection.distinct("team_name")

# Sort the team names by length (longest to shortest)
sorted_team_names = sorted(unique_team_names, key=len, reverse=True)

# Print the sorted team names
print(sorted_team_names)
