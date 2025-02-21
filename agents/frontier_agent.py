# imports

import os
import re
import math
import json
from typing import List, Dict
from openai import OpenAI
from sentence_transformers import SentenceTransformer, util
from datasets import load_dataset
from items import Item
from testing import Tester
from agents.agent import Agent
from agents.situations import Situation

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

    def make_context(self, similars: List[str]) -> str:
        """
        Create context that can be inserted into the prompt
        :param similars: similar situations to the one being estimated
        :param estimates: estimates of the similar situations
        :return: text to insert in the prompt that provides context
        """
        message = "To provide some context, here are some other situations that might be similar to the situations you need to estimate.\n\n"
        for similar in similars:
            details = json.dumps(similar['situation']['details'])
            estimate = similar['estimate']
            message += f"Potentially related situation:\n{details}\nEstimate is {estimate}\n\n"
        return message

    def messages_for(self, situation: Situation, similar_situations: List[Situation]) -> List[Dict[str, str]]:
        """
        Create the message list to be included in a call to OpenAI
        With the system and user prompt
        :param description: a description of the situation to estimate
        :param similars: similar situations to this one
        :param estimates: estimates of similar situations
        :return: the list of messages in the format expected by OpenAI
        """
        system_message = "You look for normal and anomalous situations in smart home sensor data in an elderly persons home. Reply only with the word normal or anomalous, no explanation"
        user_prompt = self.make_context(similar_situations)
        user_prompt += "And now the situaton for you:\n\n"
        details = situation.details
        user_prompt += "How would you classify this sensor data - normal or anomalous?\n\n" + json.dumps(details)
        return [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_prompt},
            {"role": "assistant", "content": "Result is "}
        ]


    def load_json_file(self, file_path):
        if not os.path.exists(file_path):
                return []
        with open(file_path, 'r') as f:
            return json.load(f)

    def vector_search(self, file_path, query, top_k=5):
        # Load JSON data
        data = self.load_json_file(file_path)

        # Extract text data to embed and keep track of indices
        texts = [item['situation']['situation_description'] for item in data]

        # Return an empty list if there are no texts
        if not texts:
            return []
        
        # Ensure top_k does not exceed the number of available texts
        top_k = min(top_k, len(texts))
            
        # Create embeddings for each text
        embeddings = self.model.encode(texts, convert_to_tensor=True)

        # Create embedding for the query
        query_embedding = self.model.encode(query, convert_to_tensor=True)

        # Compute cosine similarities
        similarities = util.pytorch_cos_sim(query_embedding, embeddings)[0]

        # Get the top_k results
        top_results = similarities.topk(top_k)

        # Return the most similar JSON objects
        return [data[idx] for idx in top_results.indices.tolist()]


    def get_result(self, text):
        # Match "normal" or "anomalous" anywhere in the text
        match = re.search(r"\b(normal|anomalous)\b", text, re.IGNORECASE)
        return match.group(1).lower() if match else None

    def estimate(self, situation: Situation) -> str:  
        """
        Make a call to OpenAI to estimate the normality of the described situation,
        by looking up 5 similar situations and including them in the prompt to give context
        :param description: a description of the situation
        :return: an estimate of the normality or otherwise of the situation
        """

        # Example usage:
        file_path = 'data/memory.json'
        query = situation.situation_description
        similar_situations = self.vector_search(file_path, query)

        self.log("Frontier Agent is about to call OpenAI with context including similar situations")
        response = self.openai.chat.completions.create(
            model=self.MODEL, 
            messages=self.messages_for(situation, similar_situations),
            seed=42,
            max_tokens=5
        )
        reply = response.choices[0].message.content
        result = self.get_result(reply)
        self.log(f"Frontier Agent completed - predicting {result}")
        return result
        