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
        
