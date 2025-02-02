from flask import Flask, request, jsonify, send_from_directory
from pymongo import MongoClient
from bson import json_util  # for converting BSON to JSON
from openai import OpenAI
import json
import os

app = Flask(__name__)

# 🔹 MongoDB Connection
uri = "mongodb+srv://Taylor:B8rurrb8tfUD2utW@rocket.j790k.mongodb.net/?retryWrites=true&w=majority&appName=rocket"
mongo_client = MongoClient(uri)
db = mongo_client['montreal_data']

# 🔹 OpenAI Client
openai_client = OpenAI(api_key="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")

# 🔹 Translation Mapping for specific collections
INSPECTIONS_TRANSLATION = {
    "arrondissement": "Borough",
    "date_premiere_inspection": "First Inspection Date",
    "nb_logements_inspectes": "Number of Inspected Homes",
    "quartier_de_reference_nom": "Reference Neighborhood",
    "statut_demande": "Inspection Status"
}

EV_CHARGING_TRANSLATION = {
    "NOM_BORNE_RECHARGE": "Charging Station Name",
    "NOM_PARC": "Location Name",
    "ADRESSE": "Address",
    "VILLE": "City",
    "PROVINCE": "Province",
    "NIVEAU_RECHARGE": "Charging Level",
    "MODE_TARIFICATION": "Pricing Model",
    "TYPE_EMPLACEMENT": "Location Type",
    "LONGITUDE": "Longitude",
    "LATITUDE": "Latitude"
}

def fix_encoding(text):
    """
    Fix mis‑decoded French characters.
    If the text appears to be UTF‑8 encoded but decoded as cp1252,
    re‑encode it using cp1252 and decode as UTF‑8.
    """
    if isinstance(text, str):
        try:
            # Using cp1252 often fixes these issues on French texts.
            return text.encode('cp1252').decode('utf8')
        except Exception:
            return text
    return text  

# 🔹 Serve Static Files (HTML, JS, CSS)
@app.route('/')
def index():
    return send_from_directory(os.getcwd(), 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory(os.getcwd(), filename)

# 🔹 Fetch Data from MongoDB
@app.route('/data', methods=['GET'])
def get_data():
    collection_name = request.args.get('collection')
    if collection_name:
        collection = db[collection_name]
        features = list(collection.find({}, {'_id': 0}))
        # Convert BSON to plain JSON so that nested properties appear as expected.
        features = json.loads(json_util.dumps(features))
        
        # Optionally apply translation mapping for certain collections.
        for feature in features:
            if "properties" in feature:
                properties = feature["properties"]
                if collection_name == "inspections_salubrite":
                    translation_map = INSPECTIONS_TRANSLATION
                elif collection_name == "bornes_recharge_publiques":
                    translation_map = EV_CHARGING_TRANSLATION
                else:
                    translation_map = None
                if translation_map is not None:
                    translated_properties = {
                        translation_map.get(k, k): fix_encoding(v)
                        for k, v in properties.items()
                        if k in translation_map
                    }
                    if "Latitude" not in translated_properties and "LATITUDE" in properties:
                        translated_properties["Latitude"] = properties["LATITUDE"]
                    if "Longitude" not in translated_properties and "LONGITUDE" in properties:
                        translated_properties["Longitude"] = properties["LONGITUDE"]
                    feature["properties"] = translated_properties

        print("DEBUG: Data Sent to Frontend:", features[:5])
        return jsonify(features)
    return jsonify([])

# 🔹 OpenAI Chatbot Route
@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        system_message = (
            "You are a helpful assistant. You can:\n"
            "1. Answer questions about the data\n"
            "2. Provide insights and analysis\n"
            "3. Help with searching and filtering\n"
            "Keep responses concise and informative."
        )

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ]

        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=150,
            temperature=0.7
        )
        assistant_response = response.choices[0].message.content
        return jsonify({'summary': assistant_response})
    except Exception as e:
        return jsonify({'error': f'Error processing message: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)
