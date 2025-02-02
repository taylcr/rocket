from flask import Flask, request, jsonify, send_from_directory
from pymongo import MongoClient
from bson import json_util  # For converting BSON to JSON
from openai import OpenAI
import json
import os

app = Flask(__name__)

# ---------------------------
# MongoDB Connection
# ---------------------------
uri = "mongodb+srv://Taylor:B8rurrb8tfUD2utW@rocket.j790k.mongodb.net/?retryWrites=true&w=majority&appName=rocket"
mongo_client = MongoClient(uri)
db = mongo_client['montreal_data']

# ---------------------------
# OpenAI Clients
# ---------------------------
# Existing chatbot client
openai_client = OpenAI(api_key="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")
# Client for region summaries and advisor chat
openai_summary_client = OpenAI(api_key="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")

# ---------------------------
# Translation Mappings for Collections
# ---------------------------

# Existing translations
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
    "TYPE_EMPLACEMENT": "Location Type"
    # Note: We omit latitude and longitude here because we will add them later.
}

# New mapping for actes_criminels – only relevant display fields
ACTES_CRIMINELS_TRANSLATION = {
    "CATEGORIE": "Category",
    "DATE": "Date",
    "QUART": "Period"
    # We intentionally do not include "Y", "LONGITUDE", or "LATITUDE"
}

# New mapping for indice_emv_2024 – only a couple of key fields
INDICE_EMV_TRANSLATION = {
    "arr_ville": "Arrondissement",
    "Indice_emv": "EMV Index"
}

# New mapping for programmation_sports_loisirs_montreal – only a few fields for display
SPORTS_TRANSLATION = {
    "nom": "Name",
    "categorie": "Category",
    "date_debut": "Start Date",
    "date_fin": "End Date",
    "promoteur": "Promoter"
}

# ---------------------------
# Helper Function
# ---------------------------
def fix_encoding(text):
    if isinstance(text, str):
        try:
            return text.encode('cp1252').decode('utf8')
        except Exception:
            return text
    return text  

# ---------------------------
# Serve Static Files
# ---------------------------
@app.route('/')
def index():
    return send_from_directory(os.getcwd(), 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory(os.getcwd(), filename)

# ---------------------------
# Fetch Data from MongoDB with Optional Field Translations
# ---------------------------
@app.route('/data', methods=['GET'])
def get_data():
    collection_name = request.args.get('collection')
    if collection_name:
        collection = db[collection_name]
        features = list(collection.find({}, {'_id': 0}))
        features = json.loads(json_util.dumps(features))
        for feature in features:
            if "properties" in feature:
                properties = feature["properties"]
                # Choose translation map based on collection name
                if collection_name == "inspections_salubrite":
                    translation_map = INSPECTIONS_TRANSLATION
                elif collection_name == "bornes_recharge_publiques":
                    translation_map = EV_CHARGING_TRANSLATION
                elif collection_name == "actes_criminels":
                    translation_map = ACTES_CRIMINELS_TRANSLATION
                elif collection_name == "indice_emv_2024":
                    translation_map = INDICE_EMV_TRANSLATION
                elif collection_name == "programmation_sports_loisirs_montreal":
                    translation_map = SPORTS_TRANSLATION
                else:
                    translation_map = None

                if translation_map is not None:
                    # Only fetch keys specified in the translation mapping.
                    translated_properties = {
                        translation_map.get(k, k): fix_encoding(v)
                        for k, v in properties.items() if k in translation_map
                    }
                    # Always add Latitude and Longitude (if present) for use in JavaScript.
                    if "Latitude" not in translated_properties and "LATITUDE" in properties:
                        translated_properties["Latitude"] = properties["LATITUDE"]
                    if "Longitude" not in translated_properties and "LONGITUDE" in properties:
                        translated_properties["Longitude"] = properties["LONGITUDE"]
                    feature["properties"] = translated_properties
        print("DEBUG: Data Sent to Frontend:", features[:5])
        return jsonify(features)
    return jsonify([])

# ---------------------------
# Chatbot Route (existing)
# ---------------------------
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
            temperature=0.7,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )
        assistant_response = response.choices[0].message.content
        return jsonify({'summary': assistant_response})
    except Exception as e:
        return jsonify({'error': f'Error processing message: {str(e)}'}), 500

# ---------------------------
# Region Summary Route (existing)
# ---------------------------
@app.route('/summarize', methods=['POST'])
def summarize():
    try:
        data = request.get_json()
        regions = data.get("regions", [])
        budget_option = data.get("budget_option", "")
        budget_min = data.get("budget_min", "")
        budget_max = data.get("budget_max", "")
        categories = data.get("categories", [])
        prompt = f"Summarize the real estate market for the following Montreal region(s): {', '.join(regions)}.\n"
        if budget_option and budget_min and budget_max:
            if budget_option.lower() == "renting":
                prompt += f"The user is looking to rent with a budget range of ${budget_min} to ${budget_max} per month.\n"
            else:
                prompt += f"The user is looking to buy with a budget range of ${budget_min} to ${budget_max}.\n"
        if categories:
            friendly = {
                "bornes_recharge_publiques": "EV Charging Stations",
                "inspections_salubrite": "Housing Inspections"
            }
            prompt += f"Category interest: {', '.join([friendly.get(c, c) for c in categories])}.\n"
        prompt += "Provide a concise summary of the current market trends, average prices, and available amenities in these areas."
        print("Summary prompt:", prompt)
        response = openai_summary_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a real estate market expert."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200,
            temperature=0.7,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )
        summary = response.choices[0].message.content
        return jsonify({"summary": summary})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------
# Advisor Chat Route (new)
# ---------------------------
@app.route('/advisor', methods=['POST'])
def advisor():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        system_message = (
            "You are a property advisor specializing in Montreal real estate. "
            "Based on the user's selected regions, budget, and interests, provide a detailed step-by-step plan. "
            "Include current interest rates, an explanation of the 'taxe de bienvenue', and all necessary steps to either rent or buy a property. "
            "Your response should be comprehensive and conversational."
        )
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ]
        response = openai_summary_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=250,
            temperature=0.7,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )
        advisor_response = response.choices[0].message.content
        return jsonify({'advisor': advisor_response})
    except Exception as e:
        return jsonify({'error': f'Error processing advisor message: {str(e)}'}), 500

# ---------------------------
# Run the Application
# ---------------------------
if __name__ == '__main__':
    app.run(debug=True)
