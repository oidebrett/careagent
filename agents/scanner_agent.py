import os
import json
import re
from typing import Optional, List
from openai import OpenAI
from agents.situations import LoadedSituation, SituationSelection
from agents.agent import Agent
from datetime import datetime

TIMEZONE = datetime.now().astimezone().tzinfo

class ScannerAgent(Agent):

    MODEL = "gpt-4o-mini"

    SYSTEM_PROMPT = f"The timezone here is {str(TIMEZONE)}. "
    SYSTEM_PROMPT += """Your task is to analyze log entries from home sensors and identify the most important situation involving an elderly person's movements that may require monitoring. You should:  

1. Select the situations with the most unusual, non-typical, or potentially concerning movement patterns.  
2. Return either a "normal" or "anomalous" result, strictly when confident.  
3. Ensure the structured output includes:  
   - "situation_description": A concise and clear summary of the situation in 4-5 sentences. Focus solely on describing events and their significance.  
   - "result": Either "normal" or "anomalous".  
   - "start_timestamp" and "end_timestamp": Exact timestamps from the logs marking the situation’s beginning and end.  
   - "details": a list of log entries that describe the situation that occured between the identified start and end timestamps. Each log entry should include the original details such as {"timestamp": 1737900000, "room": "pillbox", "nodeId": 1, "onOff": true}

**Important rules:**  

- Do not mention specific times or dates in the situation description unless they are fully aligned with the given start and end timestamps.  
- If times are included, ensure they match the provided start and end timestamps after conversion to human-readable format.  
- Respond only when highly confident about the situation's result and timestamp accuracy.  
- When returning the details of the situation, ensure that the log entries are escaped appropriately to allow these events to be easily parsed into json.
- Only include 1 situation in the response.

The output format should strictly be:  

{
  "situations": [
    {
      "situation_description": "Summary of the most concerning situation based only on log events.",
      "result": "normal | anomalous",
      "start_timestamp": "exact log entry timestamp marking the start",
      "end_timestamp": "exact log entry timestamp marking the end",
      "details": "list of log entries that relate to this situation"
    }
  ]
}
"""
    
    USER_PROMPT_PREFIX = """Analyze the following 6-hour block of log entries. Identify the most unusual or concerning movement of the elderly person. Summarize the situation concisely and ensure all timestamps in the response are correct and consistent.
Do not mention timestamps in the situation description unless they align precisely with the provided start and end timestamps.
Here are the log entries:
    
    """

    USER_PROMPT_SUFFIX = "\n\nStrictly respond in valid JSON format, and only JSON and include exactly 1 situation, no more."

    name = "Scanner Agent"
    color = Agent.CYAN

    def __init__(self):
        """
        Set up this instance by initializing OpenAI
        """
        self.log("Scanner Agent is initializing")
        self.openai = OpenAI()
        self.log("Scanner Agent is ready")

    def transform_json(self, data):
        """
        This function performs the following steps:
        
        Iterates over each string in the details list.
        Replaces single quotes with double quotes.
        Replaces True/False with true/false.
        Converts the modified string to a JSON object using json.loads.
        Collects the valid JSON objects in a list.
        Converts the list of JSON objects back to a JSON string using json.dumps.
        """
        details = data.details
        valid_json_details = []
    
        for detail in details:
            # Replace single quotes with double quotes
            detail = detail.replace("'", '"')
            # Replace True/False with true/false
            detail = re.sub(r'\bTrue\b', 'true', detail)
            detail = re.sub(r'\bFalse\b', 'false', detail)
            valid_json_details.append(detail)

        data.details = valid_json_details
        return data
    
    def fetch_situations(self, memory) -> List[LoadedSituation]:
        """
        Look up situations published in files
        Return any new situations that are not already in the memory provided
        """
        self.log("Scanner Agent is about to fetch situations from log files")
        start_timestamps = [inv.situation.start_timestamp for inv in memory]
        end_timestamps = [inv.situation.end_timestamp for inv in memory]
        loaded = LoadedSituation.fetch()

        # Convert start_timestamps to a set for faster lookups
        start_timestamps_set = set(start_timestamps)

        # Optimized filtering
        result = []
        for item in loaded:
            # Extract timestamps only once
            timestamps = {entry['timestamp'] for entry in item.details if 'timestamp' in entry}
            
            # Add item if no matching timestamps are found
            if not timestamps.intersection(start_timestamps_set):
                result.append(item)

        self.log(f"Scanner Agent received {len(result)} situations not already loaded")
        return result

    def make_user_prompt(self, loaded) -> str:
        """
        Create a user prompt for OpenAI based on the scraped deals provided
        """
        user_prompt = self.USER_PROMPT_PREFIX
        user_prompt += '\n\n'.join([situation.describe() for situation in loaded])
        user_prompt += self.USER_PROMPT_SUFFIX
        return user_prompt

    def scan(self, memory: List[str]=[]) -> Optional[SituationSelection]:
        """
        Call OpenAI to provide a high potential list of situations with good descriptions and results
        Use StructuredOutputs to ensure it conforms to our specifications
        :param memory: a list of URLs representing deals already raised
        :return: a selection of good situations, or None if there aren't any
        """
        loaded = self.fetch_situations(memory)
        if loaded:
            user_prompt = self.make_user_prompt(loaded)
            self.log("Scanner Agent is calling OpenAI using Structured Output")
            result = self.openai.beta.chat.completions.parse(
                model=self.MODEL,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                seed=42,
                response_format=SituationSelection
            )

            result = result.choices[0].message.parsed
            result.situations = [situation for situation in result.situations if situation.result is not None]

            # Transform the details field for each situation and update the list
            for i, situation in enumerate(result.situations):
                result.situations[i] = self.transform_json(situation)
            
            self.log(f"Scanner Agent received {len(result.situations)} selected situations with result not None from OpenAI")
            return result
        return None
                
