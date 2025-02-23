import pandas as pd
import numpy as np
import re
import pickle
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

#The dataset with just URLs and type --> url_dataset.csv
df = pd.read_csv("url_dataset.csv")

def cleaning(url):
    url = url.lower()
    url = re.sub(r"https[s]?://", "", url)
    url = re.sub(r"www[0-9]?", "", url)
    url = re.sub(r"[^a-zA-Z0-9]", "", url)
    return url

df["clean_url"] = df["url"].apply(cleaning)

df["malicious"] = df["type"].apply(lambda x : 1 if x == "phishing" else 0)

df = df.drop(columns=["type"])

X_train, X_test, y_train, y_test = train_test_split(df["clean_url"], 
                        df["malicious"], test_size = 0.2, random_state = 42)

vectorizer = TfidfVectorizer()
X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train_tfidf, y_train)

y_pred = model.predict(X_test_tfidf)
print("Accuracy:", accuracy_score(y_test, y_pred))
print("Classification Report:\n", classification_report(y_test, y_pred))

pickle.dump(model, open("url_classifier.pkl", "wb"))
pickle.dump(vectorizer, open("tfidf_vectorizer.pkl", "wb"))
