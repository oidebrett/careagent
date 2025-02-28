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
    SYSTEM_PROMPT += """Your task is to analyze log entries from home sensors from a home occupied by an elderly person by grouping them into 6-hour intervals and converting each grouping into a clear, human-readable scenario. For each 6-hour interval, generate a neutral narrative that describes what occurred during that period. Important: The narrative (under "situation_description") must describe the events without any judgment about whether they are normal or anomalous. The determination of "normal" or "anomalous" should be provided solely in the separate "result" field when you are highly confident.

For each 6-hour grouping, ensure the output includes:

    situation_description: A concise, neutral summary (4-5 sentences) of the events that took place during the hour. This description should detail the observed movement patterns and sensor events without implying any evaluation.
    result: A field that is either "normal" or "anomalous" based strictly on the log data. Do not embed this judgment in the narrative.
    start_timestamp and end_timestamp: The exact timestamps from the logs that mark the beginning and end of the 6-hour interval.
    details: A list of the raw log entries that occurred during the interval. Each log entry should include the original details (e.g., {"timestamp": 1737900000, "room": "pillbox", "nodeId": 1, "onOff": true}) and be escaped appropriately for JSON formatting.

Important rules:

    Do not include any evaluative or judgmental language in the "situation_description." The narrative should allow a human or another LLM to independently assess whether the events are typical for an elderly person in the house.
    When describing movements and events, you should mention human readable times of these movements and events but ensure that times used are consistent with the provided start and end timestamps.
    When making a determination on whether this situation is normal or anomalous for an elderly person ensure that you consider the times of the day that would be normal for these types of movements and events for an elderly person.
    Ensure that any time mentioned in the situation description directly corresponds to the start or end timestamps (and any other provided timestamps), without introducing new or inconsistent values.
    Process and return only one 6-hour interval grouping per response.
    When determined whether this situation's result is normal or anomalous you should consider times of events such as very late night time and early morning hours being unusual for elderly people.

The output format must strictly adhere to the following JSON structure:
{
  "situations": [
    {
      "situation_description": "Neutral narrative describing the events that occurred.",
      "result": "normal | anomalous",
      "start_timestamp": "exact log entry timestamp marking the start",
      "end_timestamp": "exact log entry timestamp marking the end",
      "details": "list of log entries that occurred in the interval"
    }
  ]
}

"""

    USER_PROMPT_PREFIX = """Analyze the following 6-hour block of log entries and create a neutral, human-readable scenario description of the events observed. 
Your description should summarize the recorded movement patterns in 4-5 clear sentences without including any evaluative language regarding whether the movement is 
typical or atypical. 
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

    def add_human_readable_time(self, data):
        """
        This function performs the following steps:
        
        Adds a human readable time to the details field.
        """
        for situation in data:
            for detail in situation.details:
                # The LLM appears to get confused with timestamped data so lets add a human readable time
                ts = detail["timestamp"]
                # Convert timestamp to a datetime object in local timezone
                dt = datetime.fromtimestamp(ts, tz=TIMEZONE)
                # Format datetime to a human-readable string (e.g., "Sun Jan 26 2025 20:00:00")
                detail["eventTime"] = dt.strftime("%a %b %d %Y %H:%M:%S")


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

        self.add_human_readable_time(loaded)

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
            # This may not be necessary but sometimes the returned details field are not transformed
            for i, situation in enumerate(result.situations):
                result.situations[i] = self.transform_json(situation)
            
            self.log(f"Scanner Agent received {len(result.situations)} selected situations with result not None from OpenAI")
            return result
        return None
                
