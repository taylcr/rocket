import json
import os
from pymongo import MongoClient, GEOSPHERE

def load_data_to_db(file_path, db, base_folder):
    file_name = os.path.splitext(os.path.basename(file_path))[0]  # Extract the file name without extension
    collection_name = file_name.replace('-', '_')  # Replace hyphens with underscores if present in file names
    collection = db[collection_name]

    # Load GeoJSON data from file
    with open(file_path, 'r') as file:
        data = json.load(file)

    # Check if the collection already exists and if it has documents
    if collection.count_documents({}) == 0:
        # Insert data into the MongoDB collection
        collection.insert_many(data['features'])
        # Create a geospatial index
        collection.create_index([("geometry", GEOSPHERE)])

    # Report loaded data
    print(f"Data loaded into collection '{collection_name}' from '{file_name}.json'.")

# MongoDB Connection
uri = "mongodb+srv://Taylor:B8rurrb8tfUD2utW@rocket.j790k.mongodb.net/?retryWrites=true&w=majority&appName=rocket"
client = MongoClient(uri)
db = client['montreal_data']

# Directory containing the data files
data_folder = './data'

# Load all JSON files in the data directory
for filename in os.listdir(data_folder):
    if filename.endswith('.json'):
        file_path = os.path.join(data_folder, filename)
        load_data_to_db(file_path, db, data_folder)
