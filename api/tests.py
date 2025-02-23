import unittest
import json
from unittest.mock import patch, MagicMock
from app import app  # assuming your flask app code is in app.py

class FlaskAppTestCase(unittest.TestCase):
    def setUp(self):
        # Set the app in testing mode
        app.config['TESTING'] = True
        self.client = app.test_client()

    def test_get_multiple_questions(self):
        # Test GET /api/game/question/starter returns 3 questions
        response = self.client.get('/api/game/question/starter')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 3)
        # Check that each question has an id and type key
        for question in data:
            self.assertIn("id", question)
            self.assertIn("type", question)
            # Depending on type, check for proper keys
            if question["type"] in ["message", "tweet"]:
                self.assertIn("content", question)
            elif question["type"] == "email":
                self.assertIn("subject", question)
                self.assertIn("body", question)
            self.assertIn("malicious", question)

    def test_get_single_question(self):
        # Test GET /api/game/question/lazy_loading returns a single question in a list
        response = self.client.get('/api/game/question/lazy_loading')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 1)
        question = data[0]
        self.assertIn("id", question)
        self.assertIn("type", question)

    @patch("app.requests.post")
    def test_post_feedback_correct(self, mock_post):
        # Simulate a scenario where user feedback matches the ground truth.
        # First, pick a question from QUESTIONS. Here we assume question id 1 is in the database.
        # For non-email types, the LLM call should not be reached.
        payload = {
            "id": 1,
            "userMalicious": False,  # matching the ground truth from QUESTIONS for id=1
            "wordsList": []
        }
        response = self.client.post(
            '/api/game/getFeedback',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data.get("feedback"), "Correct! Well done.")
        self.assertTrue(data.get("correct"))

    @patch("app.requests.post")
    def test_post_feedback_incorrect_email(self, mock_post):
        # For an email type question, simulate a call to LLM API to return feedback.
        # Setup: we pick an email question (id=3 from the QUESTIONS list).
        # We simulate a wrong user answer.
        # Prepare a fake LLM response.
        fake_llm_response = {
            "result": {
                "response": "The email shows urgent language and unusual requests."
            }
        }
        mock_post.return_value = MagicMock(status_code=200, json=lambda: fake_llm_response)

        payload = {
            "id": 3,
            "userMalicious": True,  # incorrect answer for question id 3 (which is non-malicious)
            "wordsListSubject": [0, 2],
            "wordsListBody": [1]
        }
        response = self.client.post(
            '/api/game/getFeedback',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        # Here we expect feedback text from our simulated LLM and a false "correct" value.
        self.assertIn("urgent language", data.get("feedback"))
        self.assertFalse(data.get("correct"))

    def test_post_feedback_invalid_id(self):
        # Test posting feedback with an invalid question id should return error 400.
        payload = {
            "id": 999,  # assuming this id does not exist in the database
            "userMalicious": False,
            "wordsList": []
        }
        response = self.client.post(
            '/api/game/getFeedback',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn("error", data)

    @patch("app.predict_malicious_email")
    @patch("app.get_email_explanation")
    def test_predict_malicious_email(self, mock_get_email_explanation, mock_predict_email):
        # Setup mocks for email prediction
        mock_predict_email.return_value = 0.8
        mock_get_email_explanation.return_value = "Suspicious urgent language detected."
        
        payload = {
            "type": "email",
            "subject": "Limited Time Offer",
            "body": "Act now to secure your deal!"
        }
        response = self.client.post(
            '/api/blocker/predictMalicious',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertAlmostEqual(data.get("score"), 0.8)
        self.assertIn("Suspicious", data.get("explanation"))

    @patch("app.predict_malicious_tweet")
    @patch("app.get_tweet_explanation")
    def test_predict_malicious_tweet(self, mock_get_tweet_explanation, mock_predict_tweet):
        # Setup mocks for tweet prediction
        mock_predict_tweet.return_value = 0.2
        mock_get_tweet_explanation.return_value = "Tweet appears safe."
        
        payload = {
            "type": "tweet",
            "content": "Enjoying a sunny day at the park!"
        }
        response = self.client.post(
            '/api/blocker/predictMalicious',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertAlmostEqual(data.get("score"), 0.2)
        self.assertIn("safe", data.get("explanation"))

    def test_predict_malicious_invalid_type(self):
        # Test for invalid content type in predictMalicious endpoint
        payload = {
            "type": "invalid_type",
            "content": "Some content"
        }
        response = self.client.post(
            '/api/blocker/predictMalicious',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn("error", data)

if __name__ == '__main__':
    unittest.main()