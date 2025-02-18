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


class RandomForestAgent(Agent):

    name = "Random Forest Agent"
    color = Agent.MAGENTA

    def __init__(self):
        """
        Initialize this object by loading in the saved model weights
        and the SentenceTransformer vector encoding model
        """
        self.log("Random Forest Agent is initializing")
        (self.model, self.scaler) = joblib.load('random_forest_model.pkl')
        self.log("Random Forest Agent is ready")

    def prepare_features(self, data):
        """Convert the raw sensor data into meaningful features."""
        features = {}
        
        # Get all events for this day
        events = [json.loads(event) for event in data.details]

        # Get all unique rooms
        unique_rooms = list(set(event['room'] for event in events))
        
        # Feature 1: Count events per room
        room_counts = {}
        for event in events:
            room = event['room']
            room_counts[room] = room_counts.get(room, 0) + 1
        
        # Add room counts to features
        for room in ['bedroom', 'bathroom', 'kitchen', 'livingroom', 'pillbox', 'hall', 'porch']:
            features[f'{room}_visits'] = room_counts.get(room, 0)
        
        # Feature 2: Count medication events (pillbox interactions)
        features['medication_counts'] = sum(1 for event in events 
                                        if event['room'] == 'pillbox' and event['onOff'] == True)
        
        # Feature 3: Count fridge openings
        features['fridge_openings'] = sum(1 for event in events 
                                        if event.get('event') == 'fridge_opened')
        
        # Feature 4: Calculate time spans between room transitions
        timestamps = [event['timestamp'] for event in events]
        if len(timestamps) > 1:
            features['avg_time_between_events'] = np.mean(np.diff(timestamps))
            features['max_time_between_events'] = np.max(np.diff(timestamps))
        else:
            features['avg_time_between_events'] = 0
            features['max_time_between_events'] = 0
        
        # Feature 5: Count rapid room transitions (less than 2 minutes apart)
        rapid_transitions = 0
        for i in range(len(events)-1):
            if events[i+1]['timestamp'] - events[i]['timestamp'] < 120:  # 2 minutes
                rapid_transitions += 1
        features['rapid_transitions'] = rapid_transitions
        
        return features

    # Function to predict result for a new datapoint
    def predict_anomaly(self, model, scaler, new_data):
        """Predict if a new day's data is anomalous."""
        features = self.prepare_features(new_data)
        X = np.array([list(features.values())])
        X_scaled = scaler.transform(X)
        prediction = model.predict(X_scaled)
        probability = model.predict_proba(X_scaled)
        
        return {
            'is_anomalous': bool(prediction[0]),
            'confidence': float(max(probability[0])),
            'features_used': list(features.keys())
        }
        
    def estimate(self, situation: Situation) -> str:    
        """
        Use a Random Forest model to estimate the status of the described situation
        :param item: the item to be estimated
        :return: the estimate
        """        
        self.log("Random Forest Agent is starting a prediction")
        result = self.predict_anomaly(self.model, self.scaler, situation)
        self.log(f"Random Forest Agent completed - prediction is_anomalous:{result['is_anomalous']}")
        if result['is_anomalous']:
            return 'anomalous'
        else:
            return 'normal'
        
