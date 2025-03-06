import os
import sys
import logging
import json
from typing import List, Optional
from dotenv import load_dotenv
from agents.planning_agent import PlanningAgent
from agents.situations import Situation, Investigation
from agents.rotating_json_file import RotatingJSONFile
import numpy as np

# Colors for logging
BG_BLUE = '\033[44m'
WHITE = '\033[37m'
RESET = '\033[0m'

# Colors for plot
CATEGORIES = ['Appliances', 'Automotive', 'Cell_Phones_and_Accessories', 'Electronics','Musical_Instruments', 'Office_Products', 'Tools_and_Home_Improvement', 'Toys_and_Games']
COLORS = ['red', 'blue', 'brown', 'orange', 'yellow', 'green' , 'purple', 'cyan']

def init_logging():
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter(
        "[%(asctime)s] [Agents] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S %z",
    )
    handler.setFormatter(formatter)
    root.addHandler(handler)

class CareAgentFramework:

    """Get the project root directory (2 levels up from CareAgentFramework.py)."""
    ROOT_PROJECT_PATH = os.path.dirname(os.path.dirname(__file__))
    MEMORY_FILENAME = ROOT_PROJECT_PATH + "/data/memory.json"

    def __init__(self):
        init_logging()
        load_dotenv()
        self.memory_file = RotatingJSONFile(self.MEMORY_FILENAME, retention_weeks=52, archive_dir=None, is_jsonl=False) # retain data for 1 year
        self.memory = self.read_memory()
        self.collection = [] # we should put in the anomalous situations here
        self.planner = None

    def init_agents_as_needed(self):
        if not self.planner:
            self.log("Initializing Agent Framework")
            self.planner = PlanningAgent(self.collection)
            self.log("Agent Framework is ready")
        
    def read_memory(self) -> List[Investigation]:
        if os.path.exists(self.MEMORY_FILENAME):
            data = self.memory_file.read()
            investigations = [Investigation(**item) for item in data]
            return investigations
        return []
    
    def write_memory(self) -> None:
        data = [situation.dict() for situation in self.memory]
        self.memory_file.overwrite(data)

    def update_memory(self, index, updated_investigation):
        """
        Update the estimate of an investigation at the specified index in the memory file.
        
        Args:
            index (int): The index of the investigation to update.
            updated_investigation (Investigation): The updated investigation object.
        """
        investigations = self.read_memory()
        if 0 <= index < len(investigations):
            investigations[index] = updated_investigation
            self.memory_file.overwrite([inv.dict() for inv in investigations])
        else:
            raise IndexError("Index out of range for investigations")

    def log(self, message: str):
        text = BG_BLUE + WHITE + "[Agent Framework] " + message + RESET
        logging.info(text)

    def run(self) -> List[Situation]:
        self.init_agents_as_needed()
        logging.info("Kicking off Planning Agent")
        result = self.planner.plan(memory=self.memory)
        logging.info(f"Planning Agent has completed and returned: {result}")
        if result:
            self.memory.append(result)
            self.write_memory()
        return self.memory


if __name__=="__main__":
    CareAgentFramework().run()
    