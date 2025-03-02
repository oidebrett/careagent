import json
from datetime import datetime, timedelta

TIMEZONE = datetime.now().astimezone().tzinfo

def add_datetime(situation):
    """
    For a given situation dictionary,add the datetime if it doesnt exist
    """
    # Apply the datetime to each detail timestamp.
    for detail in situation["situation"]["details"]:
        if "datetime" not in detail:
            dt = datetime.fromtimestamp(detail["timestamp"], tz=TIMEZONE)
            # Format datetime to a human-readable string (e.g., "Sun Jan 26 2025 20:00:00")
            detail["datetime"] = dt.strftime("%a %b %d %Y %H:%M:%S")

    return situation

def main():
    input_file = 'data/training_data.json'
    output_file = 'data/adjusted_training_data.json'

    # Read the JSON data from the input file.
    with open(input_file, "r") as infile:
        data = json.load(infile)

    print(f"found {len(data)} situations")
    adjusted_data = []
    for situation in data:
        # Process only situations with a "normal" estimate.
        situation = add_datetime(situation)
        adjusted_data.append(situation)

    # Write the adjusted data back to the output file.
    with open(output_file, "w") as outfile:
        json.dump(adjusted_data, outfile, indent=4)

if __name__ == "__main__":
    main()
