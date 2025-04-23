from flask import Flask, jsonify
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

@app.route('/google-gemma')
def test():
    client = InferenceClient(
        provider="nebius",
        api_key="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",
    )

    with open("./test_images/kruispunt_vlaanderen.jpg", "rb") as f:
        image_bytes = f.read()
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    completion = client.chat.completions.create(
        model="google/gemma-3-27b-it",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Geef de namen van de verkeersborden op de afbeelding en leg heel kort uit wat ze betekenen."
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

@app.route('/minicpm')
def test2():
    client = OpenAI(
        base_url="https://api.friendli.ai/dedicated/v1",
        api_key="flp_iXJ1ZktolLqYd0n7O3KGib36FIv0Qde17yKviu997Nub7"
    )
    with open("./test_images/kruispunt_vlaanderen.jpg", "rb") as f:
        image_bytes = f.read()
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    completion = client.chat.completions.create(
        model="vutsbg5s90bi",
        messages=[
             {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Give me the name of the traffic signs and what they mean in the image"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_b64}"
                        }
                    }
                ]
            }
        ]
    )

    print(completion.choices[0].message.content)
    return jsonify({'message': 'testestset'})

if __name__ == '__main__':
    app.run(debug=True)