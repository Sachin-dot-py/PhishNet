from flask import Flask, request, jsonify
import os
import requests
import random
import uuid
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne
from email_malicious import predict_malicious_email
from tweet_malicious import predict_malicious_tweet
from generate_text import generate_email, generate_tweet, generate_message

load_dotenv()
app = Flask(__name__)
client = MongoClient(os.environ.get("MONGO_URI"))
db = client.PhishNet
questions_collection = db.questions

ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
AUTH_TOKEN = os.environ.get("CLOUDFLARE_AUTH_TOKEN")
LLM_API_URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/google/gemma-2b-it-lora"

@app.route('/api/game/question/starter', methods=['GET'])
def get_multiple_questions():
    """
    Returns a list of three random questions.
    JSON Response Format:
    [
        {
            "id": str,  # A unique identifier for the question
            "type": str,
            "content": str (if type is "message" or "tweet"),
            "subject": str (if type is "email"),
            "body": str (if type is "email"),
            "malicious": bool  # Whether the text/tweet/email is malicious
        },
        ...
    ]
    """
    types = random.choices(["message", "tweet", "email"], k=3)
    questions = []
    for question_type in types:
        isMalicious = random.choice([True, False])
        new_id = str(uuid.uuid4())
        if question_type == "message":
            content = generate_message(isMalicious)
            questions.append({"id": new_id, "type": question_type, "content": content, "malicious": isMalicious})
        elif question_type == "tweet":
            content = generate_tweet(isMalicious)
            questions.append({"id": new_id, "type": question_type, "content": content, "malicious": isMalicious})
        elif question_type == "email":
            subject, body = generate_email(isMalicious)
            questions.append({"id": new_id, "type": question_type, "subject": subject, "body": body, "malicious": isMalicious})

    bulk_ops = [
        UpdateOne(
            {"id": question["id"]},
            {"$set": question},
            upsert=True
        )
        for question in questions
    ]
    
    if bulk_ops:
        questions_collection.bulk_write(bulk_ops)
    
    return jsonify(questions)

@app.route('/api/game/question/lazy_loading', methods=['GET'])
def get_single_question():
    """
    Returns a list containing a single random question.
    JSON Response Format:
    [
        {
            "id": str,  # Unique identifier for the question
            "type": str,  # One of "message", "tweet", or "email"
            "content": str (if type is "message" or "tweet"), # Max 100 words
            "subject": str (if type is "email"), # Max 15 words
            "body": str (if type is "email") # Max 100 words,
            "malicious": bool  # Whether the text/tweet/email is malicious
        }
    ]
    """
    type_ = random.choice(["message", "tweet", "email"])
    isMalicious = random.choice([True, False])
    new_id = str(uuid.uuid4())
    if type_ == "message":
        content = generate_message(isMalicious)
        question = {"id": new_id, "type": type_, "content": content, "malicious": isMalicious}
    elif type_ == "tweet":
        content = generate_tweet(isMalicious)
        question = {"id": new_id, "type": type_, "content": content, "malicious": isMalicious}
    elif type_ == "email":
        subject, body = generate_email(isMalicious)
        question = {"id": new_id, "type": type_, "subject": subject, "body": body, "malicious": isMalicious}
    
    questions_collection.update_one(
        {"id": question["id"]},
        {"$set": question},
        upsert=True
    )
    return jsonify([question])

@app.route('/api/game/getFeedback', methods=['POST'])
def post_feedback():
    """
    Receives user feedback on whether a question is malicious.
    Expected JSON Request:
    {
        "id": str,  # The question ID
        "userMalicious": bool,  # User's determination of maliciousness
        "wordsList": list (if type is "message" or "tweet"),
        "wordsListSubject": list (if type is "email"),
        "wordsListBody": list (if type is "email")
    }
    
    JSON Response:
    {
        "feedback": str,  # Response feedback message
        "correct": bool   # Whether the user was correct
    }
    """
    data = request.get_json()
    question_id = data.get("id")
    userMalicious = data.get("userMalicious")
    words = data.get("wordsList", [])
    wordsListSubject = data.get("wordsListSubject", [])
    wordsListBody = data.get("wordsListBody", [])

    # Retrieve the question details from MongoDB using the id
    question = questions_collection.find_one({"id": question_id})
    if not question:
        return jsonify({"error": "Invalid question ID"}), 400
    
    malicious = question["malicious"]
    
    if userMalicious == question["malicious"]:
        feedback = "Correct! Well done."
        return jsonify({"feedback": feedback, "correct": True})

    def ordinal(n):
        # Returns the ordinal representation for an integer n (1 -> "1st", 2 -> "2nd", etc.)
        if 10 <= n % 100 <= 20:
            suffix = 'th'
        else:
            suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')
        return f"{n}{suffix}"

    # Extract words from the subject and body by splitting on whitespace.
    subject_words = question['subject'].split()
    body_words = question['body'].split()

    selected_subject_words = []
    for idx in wordsListSubject:
        position = ordinal(idx + 1)
        word = subject_words[idx] if idx < len(subject_words) else "<invalid index>"
        selected_subject_words.append(f"the {position} \"{word}\"")

    selected_body_words = []
    for idx in wordsListBody:
        position = ordinal(idx + 1)
        word = body_words[idx] if idx < len(body_words) else "<invalid index>"
        selected_body_words.append(f"the {position} \"{word}\"")

    if selected_subject_words and selected_body_words:
        selected_words_description = (
            "Subject: " + ", ".join(selected_subject_words) + 
            "; Body: " + ", ".join(selected_body_words)
        )
    elif selected_subject_words:
        selected_words_description = "Subject: " + ", ".join(selected_subject_words)
    elif selected_body_words:
        selected_words_description = "Body: " + ", ".join(selected_body_words)
    else:
        selected_words_description = "None"

    prompt = f"""
    Email Details:
    ---------------
    Subject: {question['subject']}
    Body: {question['body']}
    Malicious (ground truth): {question['malicious']}
    User's Guess: {userMalicious}

    The user selected the following words as red flags:
    {selected_words_description}

    Based on the email content and the user's selections, provide personalized feedback that explains:
    - Why their guess (malicious or not) might be incorrect (if it is),
    - What red flag words in the message contributed to making it suspicious,
    and any brief insights that could help the user learn.
    Your response should ONLY include the feedback message to be shown to the user.
    """

    response = requests.post(
        LLM_API_URL,
        headers={"Authorization": f"Bearer {AUTH_TOKEN}"},
        json={
            "messages": [
                {"role": "system", "content": "You are an expert email security advisor."},
                {"role": "user", "content": prompt}
            ]
        }
    )
    
    feedback = response.json().get("result").get("response")
    
    return jsonify({
        "feedback": feedback,
        "correct": malicious == userMalicious
    })

def get_email_explanation(score, subject, body):
    if score > 0.7:
        prompt = (
            "Analyze the following email subject and body. "
            "Based on research, emails are often malicious if they exhibit urgent language, mismatched sender details, "
            "suspicious links/attachments, grammatical errors, or unusual requests for sensitive info. "
            "Provide a single, concise explanation (maximum 25 words) stating exactly which red flag(s) triggered the malicious score. "
            "Output only the explanation text. "
            f"Subject: {subject} Body: {body}"
        )
    else:
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
    explanation = result.get("result").get("response")
    return explanation

def get_tweet_explanation(score, content):
    if score > 0.7:
        prompt = (
            "Analyze the following tweet content. "
            "Based on research, tweets are often malicious if they sound too good to be true, exhibit urgent language, deal with money or prizes, "
            "suspicious links, grammatical errors, or unusual requests for sensitive info. "
            "Provide a single, concise explanation (maximum 25 words) stating exactly which red flag(s) triggered the malicious score. "
            "Output only the explanation text. "
            f"Tweet Content: {content}"
        )
    else:
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
    explanation = result.get("result").get("response")
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