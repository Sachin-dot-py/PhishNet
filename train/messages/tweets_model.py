import pickle
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.metrics import accuracy_score, classification_report
from datasets import load_dataset

# Load the dataset (here we use the phishing dataset as a stand-in)
dataset = load_dataset("ealvaradob/phishing-dataset", "texts", trust_remote_code=True)
df = dataset['train'].to_pandas()

# Split the dataset into training and testing sets
train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)

# Create a pipeline with TF-IDF vectorization and logistic regression
model = make_pipeline(TfidfVectorizer(max_features=5000), LogisticRegression())

# Train the model on the training data
model.fit(train_df['text'], train_df['label'])

# Evaluate the model on the test data
predictions = model.predict(test_df['text'])
print("Logistic Regression Accuracy:", accuracy_score(test_df['label'], predictions))
print(classification_report(test_df['label'], predictions))

# Save the trained model to a file
with open("malicious_tweet_model.pkl", "wb") as f:
    pickle.dump(model, f)