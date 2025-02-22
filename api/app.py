from flask import Flask, request, jsonify
import random

app = Flask(__name__)

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
            "body": str (if type is "email")
        },
        ...
    ]
    """
    questions = random.sample(QUESTIONS, 3)
    return jsonify(questions)

@app.route('/api/game/question/lazy_loading', methods=['GET'])
def get_single_question():
    """
    Returns a single random question.
    JSON Response Format:
    {
        "id": int,  # Unique identifier for the question
        "type": str,  # One of "message", "tweet", or "email"
        "content": str (if type is "message" or "tweet"),
        "subject": str (if type is "email"),
        "body": str (if type is "email")
    }
    """
    question = random.choice(QUESTIONS)
    return jsonify(question)

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

if __name__ == '__main__':
    app.run(debug=True)
