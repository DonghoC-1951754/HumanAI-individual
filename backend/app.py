from flask import Flask, jsonify, request
from flask_cors import CORS

import base64
from openai import OpenAI
import os
from huggingface_hub import InferenceClient
from google import genai
import requests
from google.genai import types

app = Flask(__name__)
CORS(app)

def get_image_base64(image_url):
    response = requests.get(image_url)
    response.raise_for_status()
    return base64.b64encode(response.content).decode('utf-8')

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

@app.route('/gemini', methods=['POST'])
def test3():
    image_id = request.json.get('imageId')
    client = genai.Client(api_key="AIzaSyC29KLWKm6-Y4ky2WbBLPMgpKs58YqaVTs")
    mapillary_token = "MLY|29035766876069488|34bbc2018881031154e33f7953b7ccc4"
    try:
        # Step 1: Get image URL from Mapillary
        metadata_url = f"https://graph.mapillary.com/{image_id}?fields=thumb_2048_url&access_token={mapillary_token}"
        meta_response = requests.get(metadata_url)
        meta_response.raise_for_status()
        image_url = meta_response.json().get('thumb_2048_url')

        # Step 2: Convert image to base64
        base64_image = get_image_base64(image_url)

        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=[
            types.Part.from_bytes(
                data=base64_image,
                mime_type='image/jpeg',
            ),
            'Can you recognize the traffic signs in the image and provide a short description of each?'
            ]
        )
        print(response.text)
        return jsonify({ "message": response.text })

    except Exception as e:
        return jsonify({ "error": str(e) }), 500


@app.route('/llama', methods=['POST'])
def test4():
    image_id = request.json.get('imageId')
    client = genai.Client(api_key="AIzaSyC29KLWKm6-Y4ky2WbBLPMgpKs58YqaVTs")
    mapillary_token = "MLY|29035766876069488|34bbc2018881031154e33f7953b7ccc4"

    metadata_url = f"https://graph.mapillary.com/{image_id}?fields=thumb_2048_url&access_token={mapillary_token}"
    meta_response = requests.get(metadata_url)
    meta_response.raise_for_status()
    image_url = meta_response.json().get('thumb_2048_url')

    # Step 2: Convert image to base64
    base64_image = get_image_base64(image_url)

    client = InferenceClient(
        provider="together",
        api_key="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",
    )

    completion = client.chat.completions.create(
        model="meta-llama/Llama-4-Scout-17B-16E-Instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Can you recognize the traffic signs in the image and provide a short description of each?"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        max_tokens=512,
    )

    print(completion.choices[0].message)
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