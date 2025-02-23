import pickle

def predict_malicious_tweet(content: str) -> float:
    """
    Predicts the probability that the given tweet content is malicious.
    
    Parameters:
        content (str): The tweet text to classify.
        
    Returns:
        float: A probability between 0 and 1 indicating how likely the tweet is malicious.
    """
    # Load the saved model from file
    with open("models/tweets/malicious_tweet_model.pkl", "rb") as f:
        model = pickle.load(f)
    
    # Get the probability estimates; index 1 corresponds to the 'malicious' class
    probability = model.predict_proba([content])[0][1]
    return probability

# Example usage
if __name__ == '__main__':
    tweet = input("Enter tweet content: ")
    prob = predict_malicious_tweet(tweet)
    print(f"Probability of being malicious: {prob:.2f}")