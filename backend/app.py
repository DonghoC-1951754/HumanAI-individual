from flask import Flask, jsonify, request
from flask_cors import CORS

import base64
from openai import OpenAI
import os
from huggingface_hub import InferenceClient

app = Flask(__name__)
CORS(app)

@app.route('/api/data')
def get_data():
    return jsonify({'message': 'Hello from Flask!'})

@app.route('/google-gemma', methods=['POST'])
def test():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    image_file = request.files['image']
    image_bytes = image_file.read()
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    client = InferenceClient(
        provider="nebius",
        api_key="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",
    )

    completion = client.chat.completions.create(
        model="google/gemma-3-27b-it",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Lijst in bulletpoints de verkeersborden (in Vlaanderen/belgie) op de afbeelding waar je echt zeker van bent samen met een korte uitleg van wat ze betekenen."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_b64}"
                        }
                    }
                ]
            }
        ],
        max_tokens=500,
    )
    return jsonify({'message': completion.choices[0].message.content})

@app.route('/minicpm', methods=['POST'])
def test2():
    client = OpenAI(
        base_url="https://api.friendli.ai/dedicated/v1",
        api_key="flp_iXJ1ZktolLqYd0n7O3KGib36FIv0Qde17yKviu997Nub7"
    )
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    image_file = request.files['image']
    image_bytes = image_file.read()
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    completion = client.chat.completions.create(
        model="google/gemma-3-27b-it",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Lijst in bulletpoints de verkeersborden op de afbeelding op met een korte uitleg van wat ze betekenen. En houdt het enkel op de bulletpoints."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_b64}"
                        }
                    }
                ]
            }
        ],
        max_tokens=200,
    )
    return jsonify({'message': completion.choices[0].message.content})

if __name__ == '__main__':
    app.run(debug=True)