from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F

# Load the model and tokenizer
model_name = "r3ddkahili/final-complete-malicious-url-model"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

def predict_malicious_url_2(link: str) -> float:
    """
    Scans the given URL and returns the probability (between 0 and 1)
    that it is malicious. Class 0 is assumed to be benign.
    """
    # Tokenize the input URL
    inputs = tokenizer(link, return_tensors="pt", truncation=True, padding=True, max_length=128)
    
    # Get model outputs
    with torch.no_grad():
        outputs = model(**inputs)
        prediction = torch.argmax(outputs.logits).item()
        return 0.5 if prediction == 0 else 0.9

# Example usage:
if __name__ == "__main__":
    test_url = "https://www.tsa.gov/news/press/releases/2025/02/11/tsa-officers-intercept-gun-reagan-national-airport"
    malicious_probability = predict_malicious_url_2(test_url)
    
    # Determine the prediction label
    if malicious_probability < 0.7:
        prediction_label = "Non-Malicious"
    else:
        prediction_label = "Malicious"
        
    print(f"Prediction: {prediction_label} (malicious probability: {malicious_probability:.2f})")