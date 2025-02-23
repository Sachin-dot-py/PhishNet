from flask import Flask, request, jsonify
import os
import requests
import random
from dotenv import load_dotenv
from email_malicious import predict_malicious_email
from tweet_malicious import predict_malicious_tweet

load_dotenv()
app = Flask(__name__)

ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
AUTH_TOKEN = os.environ.get("CLOUDFLARE_AUTH_TOKEN")
LLM_API_URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/google/gemma-2b-it-lora"

# Sample questions database
QUESTIONS = [
    {"id": 1, "type": "message", "content": "Hello, how are you?", "malicious": False},
    {"id": 2, "type": "tweet", "content": "Breaking news! Major event happening now.", "malicious": True},
    {"id": 3, "type": "email", "subject": "Urgent: Meeting Rescheduled", "body": "The meeting is rescheduled to tomorrow at 10 AM.", "malicious": False},
    {"id": 4, "type": "tweet", "content": "I love programming in Python!", "malicious": False},
    {"id": 5, "type": "message", "content": "Hey, can you call me back?", "malicious": True},
    {"id": 6, "type": "email", "subject": "Job Offer", "body": "We are pleased to offer you a position at our company.", "malicious": False}
]

@app.route('/api/game/question/starter', methods=['GET'])
def get_multiple_questions():
    """
    Returns a list of three random questions.
    JSON Response Format:
    [
        {
            "id": int,
            "type": str,
            "content": str (if type is "message" or "tweet"),
            "subject": str (if type is "email"),
            "body": str (if type is "email"),
            "malicious": bool # Whether the text/tweet/email is malicious
        },
        ...
    ]
    """
    questions = random.sample(QUESTIONS, 3)
    return jsonify(questions)

@app.route('/api/game/question/lazy_loading', methods=['GET'])
def get_single_question():
    """
    Returns a list of a single random question.
    JSON Response Format:
    [
        {
            "id": int,  # Unique identifier for the question
            "type": str,  # One of "message", "tweet", or "email"
            "content": str (if type is "message" or "tweet"), # Max 100 words
            "subject": str (if type is "email"), # Max 15 words
            "body": str (if type is "email") # Max 100 words,
            "malicious": bool # Whether the text/tweet/email is malicious
        }
    ]
    """
    question = random.choice(QUESTIONS)
    return jsonify([question])

@app.route('/api/game/getFeedback', methods=['POST'])
def post_feedback():
    """
    Receives user feedback on whether a question is malicious.
    Expected JSON Request:
    {
        "id": int,  # The question ID
        "userMalicious": bool,  # User's determination of maliciousness
        "wordsList": list (if type is "message" or "tweet"),
        "wordsListSubject": list (if type is "email"),
        "wordsListBody": list (if type is "email")
    }
    
    JSON Response:
    {
        "feedback": str,  # Response feedback message
        "correct": bool  # Whether the user was correct
    }
    """
    data = request.get_json()
    question_id = data.get("id")
    userMalicious = data.get("userMalicious")
    words = data.get("wordsList", [])
    wordsListSubject = data.get("wordsListSubject", [])
    wordsListBody = data.get("wordsListBody", [])
    
    # Fetch the question details by ID
    question = next((q for q in QUESTIONS if q["id"] == question_id), None)
    if not question:
        return jsonify({"error": "Invalid question ID"}), 400
    
    malicious = question["malicious"]
    
    feedback = "Correct! Well done." if malicious == userMalicious else "Incorrect. Here's some feedback: Try analyzing the words more carefully."
    
    response = {
        "feedback": feedback,
        "correct": malicious == userMalicious
    }
    return jsonify(response)

def get_email_explanation(score, subject, body):
    if score > 0.7:
        # Prompt for emails that appear malicious
        prompt = (
            "Analyze the following email subject and body. "
            "Based on research, emails are often malicious if they exhibit urgent language, mismatched sender details, "
            "suspicious links/attachments, grammatical errors, or unusual requests for sensitive info. "
            "Provide a single, concise explanation (maximum 25 words) stating exactly which red flag(s) triggered the malicious score. "
            "Output only the explanation text. "
            f"Subject: {subject} Body: {body}"
        )
    else:
        # Prompt for emails that appear safe
        prompt = (
            "Analyze the following email subject and body. "
            "Based on research, emails are considered safe when they lack urgent language, mismatched sender details, "
            "suspicious links/attachments, grammatical errors, or unusual requests for sensitive info. "
            "Provide a single, concise explanation (maximum 25 words) stating why the email appears safe. "
            "Output only the explanation text. "
            f"Subject: {subject} Body: {body}"
        )
    
    response = requests.post(
        LLM_API_URL,
        headers={"Authorization": f"Bearer {AUTH_TOKEN}"},
        json={
            "messages": [
                {"role": "system", "content": "You are an expert security assistant. You only have one chance to analyze the email and are only allowed to provide explanation text according to the specified requirements, with no context or follow up questions permited."},
                {"role": "user", "content": prompt}
            ]
        }
    )
    result = response.json()
    explanation = result.get("result")
    return explanation

def get_tweet_explanation(score, content):
    if score > 0.7:
        # Prompt for emails that appear malicious
        prompt = (
            "Analyze the following tweet content. "
            "Based on research, tweets are often malicious if they sound too good to be true, exhibit urgent language, deal with money or prizes"
            "suspicious links, grammatical errors, or unusual requests for sensitive info. "
            "Provide a single, concise explanation (maximum 25 words) stating exactly which red flag(s) triggered the malicious score. "
            "Output only the explanation text. "
            f"Tweet Content: {content}"
        )
    else:
        # Prompt for emails that appear safe
        prompt = (
            "Analyze the following tweet content. "
            "Based on research, tweets are considered safe when they sound reasonable, lack urgent language, "
            "suspicious links, grammatical errors, or unusual requests for sensitive info. "
            "Provide a single, concise explanation (maximum 25 words) stating why the tweet appears safe. "
            "Output only the explanation text. "
            f"Tweet Content: {content}"
        )
    
    response = requests.post(
        LLM_API_URL,
        headers={"Authorization": f"Bearer {AUTH_TOKEN}"},
        json={
            "messages": [
                {"role": "system", "content": "You are an expert security assistant. You only have one chance to analyze the tweet and are only allowed to provide explanation text according to the specified requirements, with no context or follow up questions permited."},
                {"role": "user", "content": prompt}
            ]
        }
    )
    result = response.json()
    explanation = result.get("result")
    return explanation

@app.route('/api/blocker/predictMalicious', methods=['POST'])
def predict_malicious():
    """
    Takes in a JSON payload with the following format:
    {
        "type": str,         # One of "tweet" or "email"
        "content": str,      # Provided if type is "tweet" 
        "subject": str,      # Provided if type is "email"
        "body": str          # Provided if type is "email"
    }

    Returns a JSON response in the following format:
    {
        "score": float,         # A float value between 0 and 1 representing the probability of the content being malicious
        "explanation": str      # Explanation of why we think it's malicious or not, for display to the user
    }
    """
    data = request.get_json()

    if data.get("type") not in ["tweet", "email"]:
        return jsonify({"error": "Invalid content type"}), 400
    
    if data.get("type") == "email":
        score = predict_malicious_email(data.get("subject", ""), data.get("body", ""))
        explanation = get_email_explanation(score, data.get("subject", ""), data.get("body", ""))
    elif data.get("type") == "tweet":
        score = predict_malicious_tweet(data.get("content", ""))
        explanation = get_tweet_explanation(score, data.get("content", ""))

    return jsonify({
        "score": score,
        "explanation": explanation
    })

if __name__ == '__main__':
    app.run(debug=True)
