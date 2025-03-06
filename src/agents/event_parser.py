import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
from agents.rotating_json_file import RotatingJSONFile

INVESTIGATON_PERIOD_IN_HOURS = 6

class EventParser:
    """
    EventParser groups events within 6-hour windows (i.e. INVESTIGATON_PERIOD_IN_HOURS) and returns them as structured entries.
    """

    def __init__(self, filename: str):
        self.file = RotatingJSONFile(filename, retention_weeks=52, archive_dir=None, is_jsonl=True)
        self.entries: List[Dict[str, Any]] = []

    def parse(self) -> 'EventParser':
        """
        Parse the input file and group events by a 6-hour window.
        """
        # Load and sort events by timestamp
        events = self.file.read()
        events.sort(key=lambda x: datetime.fromtimestamp(x["timestamp"]))

        grouped = []
        window_start = None
        buffer = []

        # Group events in 6-hour windows
        for event in events:
            event_time = datetime.fromtimestamp(event["timestamp"])
            
            # Start or reset grouping window
            if window_start is None or event_time > window_start + timedelta(hours=INVESTIGATON_PERIOD_IN_HOURS):
                if buffer:
                    grouped.append({"details": buffer.copy()})
                buffer.clear()
                window_start = event_time

            buffer.append(event)

        # Append any remaining events in the buffer
        if buffer:
            grouped.append({"details": buffer})

        self.entries = grouped
        return self

