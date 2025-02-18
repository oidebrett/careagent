from pydantic import BaseModel
from typing import List, Dict, Self
import re
from tqdm import tqdm
import requests
import time
from agents.event_parser import EventParser

files = [
    "data/daily_routine_data.json"
    ]


class LoadedSituation:
    """
    A class to represent a Situation retrieved from a file
    """
    details: str

    def __init__(self, entry: Dict[str, str]):
        """
        Populate this instance based on the provided dict
        """
        self.details = entry["details"]

    def __repr__(self):
        """
        Return a string to describe this deal
        """
        return f"<{self.details}>"

    def describe(self):
        """
        Return a longer string to describe this situation for use in calling a model
        """

        return f"Details: {','.join(map(str, self.details)).strip()}\n"

    @classmethod
    def fetch(cls, show_progress : bool = False) -> List[Self]:
        """
        Retrieve all events from the selected files
        """
        situations = []
        file_iter = tqdm(files) if show_progress else files
        for filename in file_iter:
            eventparser = EventParser(filename)
            grouped_events = eventparser.parse()
            situations = []
            
            for entry in grouped_events.entries:  # use [:10] to Limit to first 10 entries
                situations.append(cls(entry))

        return situations

class Situation(BaseModel):
    """
    A class to Represent a Situation with a summary description
    """
    situation_description: str
    result: str
    start_timestamp: int
    end_timestamp: int
    details: List[str]

class SituationSelection(BaseModel):
    """
    A class to Represent a list of Situations
    """
    situations: List[Situation]

class Investigation(BaseModel):
    """
    A class to represent a possible situation: a Situation where we estimate
    it could be anomalous
    """
    situation: Situation
    estimate: str
