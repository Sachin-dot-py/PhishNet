import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import SMOTE

def clean_dataset(file_path):
    df = pd.read_csv(file_path)

    selected_features = ["Request_URL", "URL_of_Anchor", "URL_Length"]
    target = "Result"

    X = df[selected_features]
    y = df[target]

    y = y.apply(lambda label: 1 if label in [-1, 0] else 0)

    X.fillna(X.median(), inplace=True)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, 
                                                    random_state=42, stratify=y)

    smote = SMOTE(random_state=42)
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train, y_train)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_resampled)
    X_test_scaled = scaler.transform(X_test)

    return X_train_scaled, X_test_scaled, y_train_resampled, y_test, scaler

def train_model(X_train, y_train):
    rf = RandomForestClassifier(random_state=42)

    param_grid = {
        'n_estimators': [100, 200, 300],
        'max_depth': [None, 10, 20, 30],
        'min_samples_split': [2, 5, 10],
        'min_samples_leaf': [1, 2, 4]
    }

    grid_search = GridSearchCV(rf, param_grid, cv=5, scoring='accuracy', 
                                                        n_jobs=-1, verbose=2)
    grid_search.fit(X_train, y_train)

    return grid_search.best_estimator_

def evaluate_model(model, X_test, y_test):
    y_pred = model.predict(X_test)

    print("Model Accuracy:", accuracy_score(y_test, y_pred))
    print("\nClassification Report:\n", classification_report(y_test, y_pred))
