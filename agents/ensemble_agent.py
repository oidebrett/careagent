import pandas as pd
from sklearn.linear_model import LinearRegression
import re
import json

from agents.agent import Agent
#from agents.specialist_agent import SpecialistAgent
#from agents.frontier_agent import FrontierAgent
from agents.situations import Situation
from agents.random_forest_agent import RandomForestAgent

class EnsembleAgent(Agent):

    name = "Ensemble Agent"
    color = Agent.YELLOW
    
    def __init__(self, collection):
        """
        Create an instance of Ensemble, by creating each of the models
        And loading the weights of the Ensemble
        """
        self.log("Initializing Ensemble Agent")
#        self.specialist = SpecialistAgent()
#        self.frontier = FrontierAgent(collection)
        self.random_forest = RandomForestAgent()
#        self.model = joblib.load('ensemble_model.pkl')
        self.log("Ensemble Agent is ready")

    def estimate(self, situation: Situation) -> float:
        """
        Run this ensemble model
        Ask each of the models to estimate the situation
        Then use the Linear Regression model to return the weighted estimate
        :param description: the description of a situation
        :return: an estimate of its classification
        """
        self.log("Running Ensemble Agent - collaborating with random forest agents")
#        specialist = self.specialist.price(description)
#        frontier = self.frontier.price(description)
        random_forest = self.random_forest.estimate(situation)
#        X = pd.DataFrame({
#            'Specialist': [specialist],
#            'Frontier': [frontier],
#            'RandomForest': [random_forest],
#            'Min': [min(specialist, frontier, random_forest)],
#            'Max': [max(specialist, frontier, random_forest)],
#        })
#        y = self.model.predict(X)[0]
        y = random_forest
        self.log(f"Ensemble Agent complete - returning ${y}")
        return y