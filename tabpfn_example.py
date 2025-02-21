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
    
    # Get all events for this day
    try:
        events = json.loads(data.details)
    except json.JSONDecodeError:
        return features  # Return empty if details are not parseable

    if not events:
        return features  # No events, return empty features

    # Feature 1: Unique room visits and their counts
    room_counts = {}  # Count visits per room
    event_counts = {}  # Count occurrences of each event type
    timestamps = []  # To track time-based features

    for event in events:
        room = event.get('room', 'unknown')
        event_type = event.get('event', 'none')
        timestamp = event.get('timestamp')

        # Update room and event counts
        room_counts[room] = room_counts.get(room, 0) + 1
        event_counts[event_type] = event_counts.get(event_type, 0) + 1

        # Track timestamps for time-based calculations
        if timestamp is not None:
            timestamps.append(timestamp)

    # Add dynamic room counts
    for room, count in room_counts.items():
        features[f'room_{room}_visits'] = count

    # Add dynamic event counts
    for event_type, count in event_counts.items():
        features[f'event_{event_type}_count'] = count

    # Feature 2: Time-based features
    if len(timestamps) > 1:
        timestamps.sort()
        time_diffs = np.diff(timestamps)
        features['avg_time_between_events'] = np.mean(time_diffs)
        features['max_time_between_events'] = np.max(time_diffs)
        features['min_time_between_events'] = np.min(time_diffs)
        features['num_rapid_transitions'] = sum(diff < 120 for diff in time_diffs)
    else:
        # Default values if not enough timestamps
        features['avg_time_between_events'] = 0
        features['max_time_between_events'] = 0
        features['min_time_between_events'] = 0
        features['num_rapid_transitions'] = 0

    return features

'''
def prepare_features(data):
    """Convert the raw sensor data into meaningful features dynamically."""
    features = {}
    
    # Get all events for this day
    try:
        events = json.loads(data.details)
    except json.JSONDecodeError:
        return features  # Return empty if details are not parseable

    if not events:
        return features  # No events, return empty features

    # Feature 1: Unique room visits and their counts
    room_counts = {}  # Count visits per room
    event_counts = {}  # Count occurrences of each event type
    timestamps = []  # To track time-based features

    for event in events:
        room = event.get('room', 'unknown')
        event_type = event.get('event', 'none')
        timestamp = event.get('timestamp')

        # Update room and event counts
        room_counts[room] = room_counts.get(room, 0) + 1
        event_counts[event_type] = event_counts.get(event_type, 0) + 1

        # Track timestamps for time-based calculations
        if timestamp is not None:
            timestamps.append(timestamp)

    # Add dynamic room counts
    for room, count in room_counts.items():
        features[f'room_{room}_visits'] = count

    # Add dynamic event counts
    for event_type, count in event_counts.items():
        features[f'event_{event_type}_count'] = count

    # Feature 2: Time-based features
    if len(timestamps) > 1:
        timestamps.sort()
        time_diffs = np.diff(timestamps)
        features['avg_time_between_events'] = np.mean(time_diffs)
        features['max_time_between_events'] = np.max(time_diffs)
        features['min_time_between_events'] = np.min(time_diffs)
        features['num_rapid_transitions'] = sum(diff < 120 for diff in time_diffs)
    else:
        # Default values if not enough timestamps
        features['avg_time_between_events'] = 0
        features['max_time_between_events'] = 0
        features['min_time_between_events'] = 0
        features['num_rapid_transitions'] = 0

    return features
'''

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
