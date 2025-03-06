import logging
import os
from typing import Optional
from dotenv import load_dotenv

class Agent:
    """
    An abstract superclass for Agents
    Used to log messages in a way that can identify each Agent
    """

    # Foreground colors
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    MAGENTA = '\033[35m'
    CYAN = '\033[36m'
    WHITE = '\033[37m'
    
    # Background color
    BG_BLACK = '\033[40m'
    
    # Reset code to return to default color
    RESET = '\033[0m'

    name: str = ""
    color: str = '\033[37m'

    def __init__(self):
        load_dotenv()
        self._project_root = self._get_project_root()
        self._data_dir = os.getenv('DATA_DIR', os.path.join(self._project_root, 'data'))

    @property
    def project_root(self) -> str:
        """Get the project root directory."""
        return self._project_root

    @property
    def data_dir(self) -> str:
        """Get the data directory path."""
        return self._data_dir

    def _get_project_root(self) -> str:
        """Get the project root directory (2 levels up from agent.py)."""
        return os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

    def get_data_file_path(self, filename: str) -> str:
        """
        Get the full path for a file in the data directory.
        
        Args:
            filename: The name of the file (e.g., 'random_forest_model.pkl')
            
        Returns:
            str: The full path to the file
        """
        return os.path.join(self.data_dir, filename)

    def load_data_file(self, filename: str, required: bool = True) -> Optional[str]:
        """
        Get the full path for a data file and verify it exists.
        
        Args:
            filename: The name of the file
            required: If True, raises FileNotFoundError when file doesn't exist
            
        Returns:
            str: The full path to the file
            
        Raises:
            FileNotFoundError: If the file doesn't exist and required=True
        """
        file_path = self.get_data_file_path(filename)
        if not os.path.exists(file_path) and required:
            raise FileNotFoundError(f"Required data file not found: {file_path}")
        return file_path if os.path.exists(file_path) else None

    def log(self, message):
        """
        Log this as an info message, identifying the agent
        """
        color_code = self.BG_BLACK + self.color
        message = f"[{self.name}] {message}"
        logging.info(color_code + message + self.RESET)
