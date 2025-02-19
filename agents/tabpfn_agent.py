# imports

import os
import re
import pandas as pd
import numpy as np
import json
from typing import List
from sentence_transformers import SentenceTransformer
import joblib
from agents.agent import Agent
from agents.situations import Situation


class TabPFNAgent(Agent):

    name = "TabPFN Agent"
    color = Agent.MAGENTA

    def __init__(self):
        """
        Initialize this object by loading in the saved model weights
        and the SentenceTransformer vector encoding model
        """
        self.log("TabPFN is initializing")
        (self.model, self.feature_names) = joblib.load('tabpfn_model.pkl')
        self.log("TabPFN is ready")

    def prepare_features(self, data):
        """Convert the raw sensor data into meaningful features dynamically."""
        features = {}
        
        # Get all events for this day
        try:
            events = [json.loads(event) for event in data.details]
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

    def prepare_tabular_data(self, data, feature_names=None):
        """Convert a list of JSON entries into a Pandas DataFrame with engineered features."""
        flattened_data = []
        for entry in data:
            features = self.prepare_features(entry)
            features['result'] = entry.result
            flattened_data.append(features)
        
        df = pd.DataFrame(flattened_data)
        df = df.fillna('missing')  # Handle missing values
        
        if feature_names:
            missing_features = {feature: 'missing' for feature in feature_names if feature not in df.columns}
            df = pd.concat([df, pd.DataFrame(missing_features, index=df.index)], axis=1)
            df = df[feature_names]
        
        return df.astype(str)  # Ensure all data is of string type


    # Function to predict result for a new datapoint
    def predict_anomaly(self, model, new_data, feature_names):
        """Predict if a new datapoint is anomalous using TabPFN."""
        df = self.prepare_tabular_data([new_data], feature_names)
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

        
    def estimate(self, situation: Situation) -> str:    
        """
        Use a tabPFN model to estimate the status of the described situation
        :param item: the item to be estimated
        :return: the estimate
        """        
        self.log("TabPFN Agent is starting a prediction")
        result = self.predict_anomaly(self.model, situation, self.feature_names)
        self.log(f"TabPFN Agent completed - prediction is_anomalous:{result['is_anomalous']}")
        if result['is_anomalous']:
            return 'anomalous'
        else:
            return 'normal'
        
