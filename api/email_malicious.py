import re
import pickle
import pandas as pd
from api.url_malicious_1 import predict_malicious_url_1
from api.url_malicious_2 import predict_malicious_url_2

# Define the same text cleaning function
def clean_text(text):
    if pd.isnull(text):
        return ""
    return text

# Load the trained model from file
model_filename = 'models/email/phishing_model.pkl'
with open(model_filename, 'rb') as f:
    pipeline = pickle.load(f)

# Function to predict malicious score for a new email
def predict_malicious_email(subject, body):
    subject_clean = clean_text(subject)
    body_clean = clean_text(body)
    text = subject_clean + " " + body_clean

    # Predict email maliciousness using the trained classifier
    email_score = pipeline.predict_proba([text])[0, 1]
    
    # Extract all links from the original (uncleaned) email body
    links = re.findall(r'(https?://\S+)', body)
    if links:
        # Get malicious score for each link using the external function
        link_scores = [(predict_malicious_url_1(link) + predict_malicious_url_2(link))/2 for link in links]
        # For combining, we use the maximum risk among all links
        url_score = max(link_scores)
    else:
        url_score = 0.0

    # Combine the scores using a weighted average:
    combined_score = max(0.7 * email_score + 0.3 * url_score, email_score)
    return combined_score

# Example usage
if __name__ == "__main__":
    subject_example = "Urgent: Account Alert"
    body_example = "Your account has been compromised. Please click the link to verify your identity."
    score = predict_malicious_email(subject_example, body_example)
    print("Malicious Score: {:.4f}".format(score))