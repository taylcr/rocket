from flask import Flask

app = Flask(__name__, static_folder='', template_folder='')

@app.route('/')
def home():
    return open('index.html').read()

@app.route('/api/data', methods=['POST'])
def api_data():
    from flask import request, jsonify
    data = request.json
    response = {"message": "Data received successfully", "data": data}
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True)
