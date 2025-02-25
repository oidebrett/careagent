# imports

import os
import re
import math
import json
import random
from dotenv import load_dotenv
from huggingface_hub import login
from items import Item
import matplotlib.pyplot as plt
import numpy as np
import pickle
from collections import Counter
from openai import OpenAI
from anthropic import Anthropic
import pandas as pd

# Import the machine learning libs
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from tabpfn import TabPFNClassifier

# moved our Tester into a separate package
# call it with Tester.test(function_name, test_dataset)

from testing import Tester

# environment

load_dotenv()
os.environ['OPENAI_API_KEY'] = os.getenv('OPENAI_API_KEY', 'your-key-if-not-using-env')
os.environ['ANTHROPIC_API_KEY'] = os.getenv('ANTHROPIC_API_KEY', 'your-key-if-not-using-env')
os.environ['OPENROUTER_API_KEY'] = os.getenv('OPENROUTER_API_KEY', 'your-key-if-not-using-env')
os.environ['HYPERBOLIC_API_KEY'] = os.getenv('HYPERBOLIC_API_KEY', 'your-key-if-not-using-env')
os.environ['HF_TOKEN'] = os.getenv('HF_TOKEN', 'your-key-if-not-using-env')

# Log in to HuggingFace

hf_token = os.environ['HF_TOKEN']
login(hf_token, add_to_git_credential=True)

openai = OpenAI()
claude = Anthropic()

# Let's avoid curating all our data again! Load in the pickle files:

with open('train.pkl', 'rb') as file:
    train = pickle.load(file)

with open('test.pkl', 'rb') as file:
    test = pickle.load(file)


# First let's work on a good prompt for a Frontier model
# Notice that I'm removing the " to the nearest dollar"
# When we train our own models, we'll need to make the problem as easy as possible, 
# but a Frontier model needs no such simplification.

def messages_for(item):
    system_message = "You look for normal and anomalous situations in smart home sensor data in an elderly persons home. Reply only with the word normal or anomalous, no explanation"
    user_prompt = item.test_prompt().replace("\n\nResult is ","")
    return [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_prompt},
        {"role": "assistant", "content": "Result is "}
    ]

# Try this out

print(messages_for(test[0]))

# A utility function to extract the result from a string

def get_result(text):
    # Match "normal" or "anomalous" anywhere in the text
    match = re.search(r"\b(normal|anomalous)\b", text, re.IGNORECASE)
    return match.group(1).lower() if match else None



def flatten_entry(entry):
    """Flatten a single JSON-like entry with indexed keys."""
    flat_dict = {}
    logs = json.loads(entry.details.strip())


    for i, log in enumerate(logs):
        for key, value in log.items():
            flat_dict[f"{i}.{key}"] = value

    flat_dict['result'] = entry.result
    return flat_dict


def prepare_features(data):
    """Convert the raw sensor data into meaningful features dynamically."""
    features = {}
    
    # Load events from data.details (which could be a JSON string, list of JSON strings, or list of dicts)
    if isinstance(data.details, str):
        events = json.loads(data.details)
    elif isinstance(data.details, list) and all(isinstance(item, str) for item in data.details):
        events = [json.loads(event) for event in data.details]
    else:  
        events = data.details

    # Dynamic room counts: count visits for every room seen in the events
    room_counts = {}
    for event in events:
        room = event.get('room')
        if room is not None:
            room_counts[room] = room_counts.get(room, 0) + 1
    # Add dynamic room count features (keys will be like 'room_kitchen_visits', etc.)
    for room, count in room_counts.items():
        features[f'room_{room}_visits'] = count

    # Timestamp based features:
    # Calculate average and maximum time between consecutive events
    timestamps = [event.get('timestamp') for event in events if 'timestamp' in event]
    if len(timestamps) > 1:
        diffs = np.diff(timestamps)
        features['avg_time_between_events'] = float(np.mean(diffs))
        features['max_time_between_events'] = float(np.max(diffs))
    else:
        features['avg_time_between_events'] = 0.0
        features['max_time_between_events'] = 0.0
    
    # Count rapid transitions (events less than 2 minutes apart)
    rapid_transitions = 0
    for i in range(len(timestamps) - 1):
        if timestamps[i+1] - timestamps[i] < 120:
            rapid_transitions += 1
    features['rapid_transitions'] = rapid_transitions

    # Attribute features:
    # For each attribute present, create a feature (e.g., "TemperatureMeasurement_MeasuredValue")
    # and aggregate by taking the average value for that attribute over the period.
    attr_values = {}  # key: feature name, value: list of measurements
    for event in events:
        attr = event.get('attribute', {})
        # Each event's attribute is assumed to be a dict with a single key
        for attr_name, inner in attr.items():
            # inner is a dict (e.g., {"MeasuredValue": 1901} or {"Occupancy": 1})
            for inner_key, value in inner.items():
                feature_key = f"{attr_name}_{inner_key}"
                try:
                    numeric_value = float(value)
                except (ValueError, TypeError):
                    continue
                if feature_key not in attr_values:
                    attr_values[feature_key] = []
                attr_values[feature_key].append(numeric_value)
    
    # Compute the average for each attribute feature if available
    for key, values in attr_values.items():
        features[key] = float(np.mean(values))
    
    return features


def prepare_tabular_data(data, feature_names=None):
    """Convert a list of JSON entries into a Pandas DataFrame with engineered features."""
    flattened_data = []
    for entry in data:
        features = prepare_features(entry)
        features['result'] = entry.result
        flattened_data.append(features)
    
    df = pd.DataFrame(flattened_data)
    df = df.fillna('missing')  # Handle missing values
    
    if feature_names:
        missing_features = {feature: 'missing' for feature in feature_names if feature not in df.columns}
        df = pd.concat([df, pd.DataFrame(missing_features, index=df.index)], axis=1)
        df = df[feature_names]
    
    return df.astype(str)  # Ensure all data is of string type

def train_anomaly_detector(json_data):
    """Train a TabPFN model to detect anomalies."""
    df = prepare_tabular_data(json_data)
    
    # Separate features and labels
    X = df.drop(columns=['result'], errors='ignore')
    y = (df['result'] == 'anomalous').astype(int)  # Binary classification

    # Convert all columns to string type to avoid type issues
    X = X.astype(str)

    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Initialize TabPFN classifier
    model = TabPFNClassifier()
    model.fit(X_train, y_train)

    # Predict probabilities
    prediction_probabilities = model.predict_proba(X_test)
    print("ROC AUC:", roc_auc_score(y_test, prediction_probabilities[:, 1]))

    # Predict labels
    y_pred = model.predict(X_test)
    print(classification_report(y_test, y_pred))

    return model, X_train.columns.tolist()

def predict_anomaly(model, new_data, feature_names):
    """Predict if a new datapoint is anomalous using TabPFN."""
    df = prepare_tabular_data([new_data], feature_names)
    X = df.drop(columns=['result'], errors='ignore')

    # Ensure no NaN values are present
    X = X.fillna('missing')

    # Ensure the feature order matches the training order
    X = X[feature_names]

    prediction = model.predict(X)
    probability = model.predict_proba(X)

    return {
        'is_anomalous': bool(prediction[0]),
        'confidence': float(max(probability[0])),
        'features_used': list(X.columns)
    }

def tabpfn_anomaly_assessor(item):
    """Wrapper function to assess anomalies using TabPFN."""
    result = predict_anomaly(model, item, feature_names)
    return 'anomalous' if result['is_anomalous'] else 'normal'


# Example usage:
model, feature_names = train_anomaly_detector(train)
result = predict_anomaly(model, test[0], feature_names)
# Tester.test(tabpfn_anomaly_assessor, test)
