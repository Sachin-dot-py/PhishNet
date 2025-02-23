from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.metrics import accuracy_score, classification_report
from datasets import load_dataset

dataset = load_dataset("ealvaradob/phishing-dataset", "texts", trust_remote_code=True)
df = dataset['train'].to_pandas()

train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)

logistic_model = make_pipeline(TfidfVectorizer(max_features=5000), LogisticRegression())

logistic_model.fit(train_df['text'], train_df['label'])

predictions = logistic_model.predict(test_df['text'])

print("Logistic Regression Accuracy:", accuracy_score(test_df['label'], predictions))
print(classification_report(test_df['label'], predictions))
