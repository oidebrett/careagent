import os
import json
import shutil
from datetime import datetime, timedelta

class RotatingJSONFile:
    def __init__(self, filename, retention_weeks=1, archive_dir=None, is_jsonl=True):
        self.filename = filename
        self.retention_weeks = retention_weeks
        self.archive_dir = archive_dir or os.path.join(os.path.dirname(filename), "archives")
        self.is_jsonl = is_jsonl
        os.makedirs(self.archive_dir, exist_ok=True)

    def _rotate_file(self):
        """Rotate the file if it contains data older than the retention period."""
        if not os.path.exists(self.filename):
            return

        cutoff_date = datetime.now() - timedelta(weeks=self.retention_weeks)
        new_data = []
        old_data = []

        with open(self.filename, 'r') as file:
            if self.is_jsonl:
                for line in file:
                    try:
                        entry = json.loads(line)
                        if isinstance(entry, str):
                            entry = json.loads(entry)
                        timestamp = datetime.fromtimestamp(entry['timestamp'])
                        if timestamp < cutoff_date:
                            old_data.append(line)
                        else:
                            new_data.append(line)
                    except (json.JSONDecodeError, KeyError):
                        continue
            else:
                try:
                    data = json.load(file)
                    for entry in data:
                        timestamp = datetime.fromtimestamp(entry['situation']['start_timestamp'])
                        if timestamp < cutoff_date:
                            old_data.append(entry)
                        else:
                            new_data.append(entry)
                except json.JSONDecodeError:
                    pass

        if old_data:
            extension = 'jsonl' if self.is_jsonl else 'json'
            archive_filename = os.path.join(self.archive_dir, f"archive_{cutoff_date.strftime('%Y_%m_%d')}.{extension}")
            with open(archive_filename, 'a') as archive_file:
                if self.is_jsonl:
                    archive_file.writelines(old_data)
                else:
                    json.dump(old_data, archive_file)

        with open(self.filename, 'w') as file:
            if self.is_jsonl:
                file.writelines(new_data)
            else:
                json.dump(new_data, file)

    def read(self):
        """Read the entire file and return as a list of dicts."""
        self._rotate_file()
        data = []
        if os.path.exists(self.filename):
            with open(self.filename, 'r') as file:
                if self.is_jsonl:
                    for line in file:
                        try:
                            data.append(json.loads(line))
                        except json.JSONDecodeError:
                            continue
                else:
                    try:
                        data = json.load(file)
                    except json.JSONDecodeError:
                        pass
        return data

    def write(self, data):
        """Write a list of JSON-compatible dicts to the file."""
        self._rotate_file()
        with open(self.filename, 'a') as file:
            if self.is_jsonl:
                for entry in data:
                    file.write(json.dumps(entry) + '\n')
            else:
                json.dump(data, file)

    def overwrite(self, data):
        """Overwrite the file with a new list of JSON-compatible dicts."""
        self._rotate_file()
        with open(self.filename, 'w') as file:
            if self.is_jsonl:
                for entry in data:
                    file.write(json.dumps(entry) + '\n')
            else:
                json.dump(data, file)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        pass