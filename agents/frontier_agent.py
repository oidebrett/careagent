# imports

import os
import re
import math
import json
from typing import List, Dict
from openai import OpenAI
from sentence_transformers import SentenceTransformer
from datasets import load_dataset
import chromadb
from items import Item
from testing import Tester
from agents.agent import Agent


class FrontierAgent(Agent):

    name = "Frontier Agent"
    color = Agent.BLUE

    MODEL = "gpt-4o-mini"
    
    def __init__(self, collection):
        """
        Set up this instance by connecting to OpenAI, to the Chroma Datastore,
        And setting up the vector encoding model
        """
        self.log("Initializing Frontier Agent")
        self.openai = OpenAI()
        self.collection = collection
        self.model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        self.log("Frontier Agent is ready")

    def make_context(self, similars: List[str], estimates: List[str]) -> str:
        """
        Create context that can be inserted into the prompt
        :param similars: similar situations to the one being estimated
        :param estimates: estimates of the similar situations
        :return: text to insert in the prompt that provides context
        """
        message = "To provide some context, here are some other situations that might be similar to the situations you need to estimate.\n\n"
        for similar, estimate in zip(similars, estimates):
            message += f"Potentially related situation:\n{similar}\nEstimate is {estimate}\n\n"
        return message

    def messages_for(self, description: str, similars: List[str], estimates: List[str]) -> List[Dict[str, str]]:
        """
        Create the message list to be included in a call to OpenAI
        With the system and user prompt
        :param description: a description of the situation to estimate
        :param similars: similar situations to this one
        :param estimates: estimates of similar situations
        :return: the list of messages in the format expected by OpenAI
        """
        system_message = "You look for normal and anomalous situations in smart home sensor data in an elderly persons home. Reply only with the word normal or anomalous, no explanation"
        user_prompt = self.make_context(similars, estimates)
        user_prompt += "And now the situaton for you:\n\n"
        user_prompt += "How would you classify this sensor data - normal or anomalous?\n\n" + description
        return [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_prompt},
            {"role": "assistant", "content": "Result is "}
        ]

    def find_similars(self, description: str):
        """
        Return a list of items similar to the given one by looking in the Chroma datastore
        """
        self.log("Frontier Agent is performing a RAG search of the Chroma datastore to find 5 similar situations")
        vector = self.model.encode([description])
        results = self.collection.query(query_embeddings=vector.astype(float).tolist(), n_results=5)
        documents = results['documents'][0][:]
        estimates = [m['estimate'] for m in results['metadatas'][0][:]]
        self.log("Frontier Agent has found similar estimates")
        return documents, estimates

    def get_result(text):
        # Match "normal" or "anomalous" anywhere in the text
        match = re.search(r"\b(normal|anomalous)\b", text, re.IGNORECASE)
        return match.group(1).lower() if match else None

    def estimate(self, description: str) -> float:
        """
        Make a call to OpenAI to estimate the normality of the described situation,
        by looking up 5 similar situations and including them in the prompt to give context
        :param description: a description of the situation
        :return: an estimate of the normality or otherwise of the situation
        """
        documents, estimates = self.find_similars(description)
        self.log("Frontier Agent is about to call OpenAI with context including 5 similar situations")
        response = self.openai.chat.completions.create(
            model=self.MODEL, 
            messages=self.messages_for(description, documents, estimates),
            seed=42,
            max_tokens=5
        )
        reply = response.choices[0].message.content
        result = self.get_result(reply)
        self.log(f"Frontier Agent completed - predicting {result}")
        return result
        