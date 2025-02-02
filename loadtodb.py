import json
import os
from pymongo import MongoClient, GEOSPHERE

def load_data_to_db(file_path, db):
    """
    Load a GeoJSON file into a MongoDB collection.

    Args:
        file_path (str): Path to the JSON file.
        db (MongoClient.Database): MongoDB database instance.
    """
    file_name = os.path.splitext(os.path.basename(file_path))[0]  # Extract filename without extension
    collection_name = file_name.replace('-', '_')  # Replace hyphens with underscores
    collection = db[collection_name]

    try:
        # Open file with UTF-8 encoding
        with open(file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)

        # Ensure the file contains valid GeoJSON
        if 'features' not in data:
            print(f"Skipping '{file_name}.json': Missing 'features' key")
            return

        # Insert data only if the collection is empty
        if collection.count_documents({}) == 0:
            collection.insert_many(data['features'])
            collection.create_index([("geometry", GEOSPHERE)])  # Create geospatial index
            print(f"✅ Data loaded into collection '{collection_name}' from '{file_name}.json'.")
        else:
            print(f"⚠️ Collection '{collection_name}' already contains data. Skipping.")
    
    except json.JSONDecodeError as e:
        print(f"❌ JSON decoding error in '{file_name}.json': {e}")
    except Exception as e:
        print(f"❌ Error processing '{file_name}.json': {e}")

# MongoDB Connection
MONGO_URI = "mongodb+srv://Taylor:B8rurrb8tfUD2utW@rocket.j790k.mongodb.net/?retryWrites=true&w=majority&appName=rocket"
client = MongoClient(MONGO_URI)
db = client['montreal_data']

# Directory containing the data files
DATA_FOLDER = './data'

# Process all JSON files in the data directory
if os.path.exists(DATA_FOLDER):
    json_files = [f for f in os.listdir(DATA_FOLDER) if f.endswith('.json')]

    if not json_files:
        print("⚠️ No JSON files found in the data folder.")
    else:
        for filename in json_files:
            file_path = os.path.join(DATA_FOLDER, filename)
            load_data_to_db(file_path, db)
else:
    print(f"❌ Data folder '{DATA_FOLDER}' not found.")
