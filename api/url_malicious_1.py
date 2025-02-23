import pickle
import re

# Define the same cleaning function used during training
def cleaning(url: str) -> str:
    url = url.lower()
    url = re.sub(r"https[s]?://", "", url)
    url = re.sub(r"www[0-9]?", "", url)
    url = re.sub(r"[^a-zA-Z0-9]", "", url)
    return url

# Load the trained model and vectorizer from the pickle files
with open("models/url/url_classifier.pkl", "rb") as model_file:
    model = pickle.load(model_file)

with open("models/url/tfidf_vectorizer.pkl", "rb") as vec_file:
    vectorizer = pickle.load(vec_file)

def predict_malicious_url_1(link: str) -> float:
    """
    Scans the given URL and returns the probability (between 0 and 1)
    that it is malicious.
    """
    # Clean the input link in the same way as during training
    cleaned_link = cleaning(link)
    
    # Transform the cleaned link using the loaded TF-IDF vectorizer
    link_vectorized = vectorizer.transform([cleaned_link])
    
    # Get the probability of being malicious.
    # Assumes that class '1' is malicious.
    probability = model.predict_proba(link_vectorized)[0][1]
    return probability

# Example usage:
if __name__ == "__main__":
    test_url = "http://example.com/suspicious"
    print(f"Malicious probability: {predict_malicious_url(test_url):.2f}")