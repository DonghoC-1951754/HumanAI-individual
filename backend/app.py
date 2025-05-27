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
    location = request.json.get('location')  # <-- Accept location from frontend
    client = genai.Client(api_key="AIzaSyC29KLWKm6-Y4ky2WbBLPMgpKs58YqaVTs")
    mapillary_token = "MLY|29035766876069488|34bbc2018881031154e33f7953b7ccc4"
    try:
        metadata_url = f"https://graph.mapillary.com/{image_id}?fields=thumb_2048_url&access_token={mapillary_token}"
        meta_response = requests.get(metadata_url)
        meta_response.raise_for_status()
        image_url = meta_response.json().get('thumb_2048_url')

        base64_image = get_image_base64(image_url)

        prompt = (
            f""" Find every traffic sign on the image considering this is in {location}.
            For each traffic sign you recognized provide a list of:
                1. The description of the traffic sign
                2. The meaning of the traffic sign in {location}
                3. The traffic sign code "Traffic Sign Code: [CODE]"
            Also put a whitespace between each traffic sign description.
            """
        )

        response = client.models.generate_content(
            model='gemini-2.5-flash-preview-05-20',
            contents=[
                types.Part.from_bytes(data=base64_image, mime_type='image/jpeg'),
                prompt
            ]
        )

        return jsonify({"message": response.text})

    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/llama', methods=['POST'])
def test4():
    image_id = request.json.get('imageId')
    location = request.json.get('location')  # <-- Accept location

    client = genai.Client(api_key="AIzaSyC29KLWKm6-Y4ky2WbBLPMgpKs58YqaVTs")
    mapillary_token = "MLY|29035766876069488|34bbc2018881031154e33f7953b7ccc4"

    metadata_url = f"https://graph.mapillary.com/{image_id}?fields=thumb_2048_url&access_token={mapillary_token}"
    meta_response = requests.get(metadata_url)
    meta_response.raise_for_status()
    image_url = meta_response.json().get('thumb_2048_url')

    base64_image = get_image_base64(image_url)

    client = InferenceClient(
        provider="together",
        api_key="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",
    )

    prompt = (
            f""" Find every traffic sign on the image considering this is in {location}.
            For each traffic sign you recognized provide a list of:
                1. The description of the traffic sign
                2. The meaning of the traffic sign in {location}
                3. The traffic sign code "Traffic Sign Code: [CODE]"
            Also put a whitespace between each traffic sign description.
            """
    )

    completion = client.chat.completions.create(
        model="meta-llama/Llama-4-Scout-17B-16E-Instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                    }
                ]
            }
        ],
        max_tokens=512,
    )

    return jsonify({'message': completion.choices[0].message.content})


@app.route('/contextual-validation', methods=['POST'])
def test5():
    data = request.get_json()

    if not data or 'gemini_output' not in data or 'llama_output' not in data:
        return jsonify({'error': 'Missing required data. Please provide both gemini_output and llama_output.'}), 400

    gemini_output = data['gemini_output']
    llama_output = data['llama_output']
    location = data['location']
    # print("Gemini Output:", gemini_output)
    # print("Llama Output:", llama_output)

    prompt = f"""Compare two outputs from different AI models regarding traffic signs in {location}.
                Gemini output: {gemini_output}
                Llama output: {llama_output}
                Take the description and meaning that are the same in both outputs.
                Combine the 2 outputs into a single final output.
                Also check whether the traffic sign codes of the meanings and descriptions are correct acoording to the rules in {location}.
                """

    model = init_chat_model("gpt-4o-mini", model_provider="openai")
    response = model.invoke(prompt).content
    return jsonify({"message": response})

