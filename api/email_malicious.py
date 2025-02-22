import re
import pickle
import pandas as pd

# Define the same text cleaning function
def clean_text(text):
    if pd.isnull(text):
        return ""
    text = text.lower()
    text = re.sub(r'http\S+|www\S+|@\S+', '', text)
    text = re.sub(r'[^a-z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
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
    score = pipeline.predict_proba([text])[0, 1]
    return score

# Example usage
if __name__ == "__main__":
    subject_example = "Urgent: Account Alert"
    body_example = "Your account has been compromised. Please click the link to verify your identity."
    score = predict_malicious_email(subject_example, body_example)
    print("Malicious Score: {:.4f}".format(score))