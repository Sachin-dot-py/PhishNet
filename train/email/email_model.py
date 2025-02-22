import os
import re
import pandas as pd
import pickle
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, accuracy_score

# Define a simple text cleaning function
def clean_text(text):
    if pd.isnull(text):
        return ""
    text = text.lower()  # convert to lowercase
    text = re.sub(r'http\S+|www\S+|@\S+', '', text)  # remove URLs and email addresses
    text = re.sub(r'[^a-z\s]', '', text)  # remove special characters and numbers
    text = re.sub(r'\s+', ' ', text).strip()  # remove extra spaces
    return text

# Function to load and clean a dataset given a file path and its expected columns
def load_dataset(file_path, columns):
    df = pd.read_csv(file_path)
    df = df[columns]  # ensure required columns exist
    df['subject'] = df['subject'].apply(clean_text)
    df['body'] = df['body'].apply(clean_text)
    df['text'] = df['subject'] + " " + df['body']
    return df[['text', 'label']]

# List of dataset files and the corresponding columns to use
datasets_info = [
    {"file": "PhishingEmailDataset/CEAS_08.csv", "cols": ["subject", "body", "label"]},
    {"file": "PhishingEmailDataset/Enron.csv",   "cols": ["subject", "body", "label"]},
    {"file": "PhishingEmailDataset/Ling.csv",    "cols": ["subject", "body", "label"]},
    {"file": "PhishingEmailDataset/Nazario.csv",   "cols": ["subject", "body", "label"]},
    {"file": "PhishingEmailDataset/Nigerian_Fraud.csv", "cols": ["subject", "body", "label"]},
    {"file": "PhishingEmailDataset/SpamAssasin.csv", "cols": ["subject", "body", "label"]}
]

# Load and merge all datasets into one DataFrame
dataframes = []
for ds in datasets_info:
    if os.path.exists(ds["file"]):
        print(f"Loading {ds['file']} ...")
        df = load_dataset(ds["file"], ds["cols"])
        dataframes.append(df)
    else:
        print(f"Warning: File {ds['file']} not found.")

if not dataframes:
    raise FileNotFoundError("No dataset files found. Please check your file paths.")

merged_df = pd.concat(dataframes, ignore_index=True)
merged_df.drop_duplicates(subset=['text'], inplace=True)
merged_df = merged_df[merged_df['text'].str.strip() != ""]

print("Merged dataset shape:", merged_df.shape)

# Prepare features and target variable
X = merged_df['text']
y = merged_df['label']

# Split the data into training and test sets
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Build a pipeline: vectorize text then train logistic regression
pipeline = Pipeline([
    ('tfidf', TfidfVectorizer(stop_words='english', max_features=5000)),
    ('clf', LogisticRegression(solver='lbfgs', max_iter=1000))
])

# Train the model
pipeline.fit(X_train, y_train)

# Evaluate on the test set
y_pred = pipeline.predict(X_test)
y_proba = pipeline.predict_proba(X_test)[:, 1]  # probability for class 1 (malicious)

accuracy = accuracy_score(y_test, y_pred)
roc_auc = roc_auc_score(y_test, y_proba)

print("Test Accuracy: {:.2f}%".format(accuracy * 100))
print("Test ROC-AUC: {:.4f}".format(roc_auc))

# Save the trained pipeline to a file
model_filename = 'phishing_model.pkl'
with open(model_filename, 'wb') as f:
    pickle.dump(pipeline, f)

print(f"Model saved to {model_filename}")