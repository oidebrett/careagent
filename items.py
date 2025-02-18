from typing import Optional
from transformers import AutoTokenizer
import re
import json

BASE_MODEL = "meta-llama/Meta-Llama-3.1-8B"
#BASE_MODEL = "deepseek-ai/DeepSeek-R1"

MIN_TOKENS = 15 # Any less than this, and we don't have enough useful content
MAX_TOKENS = 1160 # Truncate after this many tokens. Then after adding in prompt text, we will get to around 1180 tokens

MIN_CHARS = 30
CEILING_CHARS = MAX_TOKENS * 7

class Item:
    """
    An Item is a cleaned, curated datapoint of a Product with a Price
    """
    
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
    PREFIX = "Result is "
    QUESTION = "How would you classify this sensor data - normal or anomalous?"
    REMOVALS = ['"event": "car_opened"']

    result: str
    category: str
    token_count: int = 0
    details: Optional[str]
    prompt: Optional[str] = None
    include = False

    def __init__(self, data, result):
        self.result = result
        data = self.transformJson(data)
        self.parse(data)

    def scrub(self, stuff):
        """
        Clean up the provided text by removing unnecessary characters and whitespace
        """
        return stuff
        
    def transformJson(self, data):
        """
        This function performs the following steps:
        
        Iterates over each string in the details list.
        Replaces single quotes with double quotes.
        Replaces True/False with true/false.
        Converts the modified string to a JSON object using json.loads.
        Collects the valid JSON objects in a list.
        Converts the list of JSON objects back to a JSON string using json.dumps.
        """
        details = data['details']
        valid_json_details = []
    
        for detail in details:
            # Replace single quotes with double quotes
            detail = detail.replace("'", '"')
            # Replace True/False with true/false
            detail = re.sub(r'\bTrue\b', 'true', detail)
            detail = re.sub(r'\bFalse\b', 'false', detail)
            valid_json_details.append(json.loads(detail))

        data['details'] = valid_json_details
        return data
        
    def parse(self, data):
        """
        Parse this datapoint and if it fits within the allowed Token range,
        then set include to True
        """
        contents = json.dumps(data['details'])
        if contents:
            contents += '\n'
        self.details = contents
        if len(contents) > MIN_CHARS:
            contents = contents[:CEILING_CHARS]
            text = f"{self.scrub(contents)}"
            tokens = self.tokenizer.encode(text, add_special_tokens=False)
            if len(tokens) > MIN_TOKENS:
                tokens = tokens[:MAX_TOKENS]
                text = self.tokenizer.decode(tokens)
                self.make_prompt(text)
                self.include = True

    def make_prompt(self, text):
        """
        Set the prompt instance variable to be a prompt appropriate for training
        """
        self.prompt = f"{self.QUESTION}\n\n{text}\n\n"
        self.prompt += f"{self.PREFIX}{self.result}"
        self.token_count = len(self.tokenizer.encode(self.prompt, add_special_tokens=False))

    def test_prompt(self):
        """
        Return a prompt suitable for testing, with the actual result removed
        """
        return self.prompt.split(self.PREFIX)[0] + self.PREFIX

    def __repr__(self):
        """
        Return a String version of this Item
        """
        return f"<${self.result}>"

        

    
    