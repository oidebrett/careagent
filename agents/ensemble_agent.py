import pandas as pd
from sklearn.linear_model import LinearRegression
import re
import json

from agents.agent import Agent
#from agents.specialist_agent import SpecialistAgent
from agents.frontier_agent import FrontierAgent
from agents.situations import Situation
from agents.random_forest_agent import RandomForestAgent
from agents.tabpfn_agent import TabPFNAgent

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
        self.frontier = FrontierAgent(collection)
        self.random_forest = RandomForestAgent()
        self.tabPFN = TabPFNAgent()
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
        frontier = self.frontier.estimate(situation)
        random_forest = self.random_forest.estimate(situation)
        tabPFN = self.tabPFN.estimate(situation)

        # Collect votes
        votes = [frontier, random_forest, tabPFN]

        # Determine the majority vote
        normal_votes = votes.count("normal")
        anomalous_votes = votes.count("anomalous")

        # Return the label with the most votes
        if normal_votes > anomalous_votes:
            y = "normal"
        else:
            y = "anomalous"

        self.log(f"Ensemble Agent ran a vote - returning {y}")
        return y
    
    