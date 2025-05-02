from flask import Flask, jsonify, request
from flask_cors import CORS

import base64
from openai import OpenAI
import os
from huggingface_hub import InferenceClient
from google import genai
import requests
from google.genai import types
from langchain.chat_models import init_chat_model

app = Flask(__name__)
CORS(app)

def get_image_base64(image_url):
    response = requests.get(image_url)
    response.raise_for_status()
    return base64.b64encode(response.content).decode('utf-8')


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
        # print(response.text)
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

    # print(completion.choices[0].message)
    return jsonify({'message': completion.choices[0].message.content})

@app.route('/contextual-validation', methods=['POST'])
def test5():
    data = request.get_json()

    if not data or 'gemini_output' not in data or 'llama_output' not in data:
        return jsonify({'error': 'Missing required data. Please provide both gemini_output and llama_output.'}), 400

    gemini_output = data['gemini_output']
    llama_output = data['llama_output']
    # print("Gemini Output:", gemini_output)
    # print("Llama Output:", llama_output)

    prompt = f"""I want to validate the following two outputs from two different AI models in the context of traffic sign recognition.
    The first output is from the Gemini model, and the second output is from the Llama model.
    The first output is: {gemini_output}
    The second output is: {llama_output}
    I want you to provide the real answer for the traffic sign recognition task by taking the best of the two outputs or modifying them if needed. And don't put other texts in your answer just start your answer with "Here the identified traffic signs and rules on the image"
    """

    model = init_chat_model("gpt-4o-mini", model_provider="openai")
    response = model.invoke(prompt).content
    return jsonify({"message": response})

