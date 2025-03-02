import json
from datetime import datetime, timedelta

def determine_target_keyword(description):
    """Return the target keyword based on the situation description."""
    desc = description.lower()
    if "morning" in desc:
        return "morning"
    elif "afternoon" in desc:
        return "afternoon"
    elif "evening" in desc:
        return "evening"
    else:
        return "morning"  # default window

def in_target_window(dt, target_keyword):
    """Check if a datetime is in the target window based on keyword."""
    if target_keyword == "morning":
        return 6 <= dt.hour < 12
    elif target_keyword == "afternoon":
        return 12 <= dt.hour < 18
    elif target_keyword == "evening":
        return 18 <= dt.hour < 24
    else:
        return 6 <= dt.hour < 12

def get_target_base_time(dt, target_keyword):
    """
    Return a datetime corresponding to the target base time for dt.
    If dt is not already in the target window, then return a datetime with the same date
    (or the next day, if needed) and hour set to the window’s base.
    """
    if target_keyword == "morning":
        base_hour = 6
    elif target_keyword == "afternoon":
        base_hour = 12
    elif target_keyword == "evening":
        base_hour = 18
    else:
        base_hour = 6

    # Create a datetime with the same date but at the base hour (with minutes, seconds zeroed)
    target_dt = dt.replace(hour=base_hour, minute=0, second=0, microsecond=0)
    # If dt is already later than target_dt (i.e. dt was after the intended base on the same day)
    # then assume we want to shift to the next day.
    if dt > target_dt:
        target_dt += timedelta(days=1)
    return target_dt

def adjust_timestamps(situation):
    """
    For a given situation dictionary, check if all timestamps are in the target window.
    If not, compute a constant offset (based on the first timestamp) to shift them into the window.
    """
    desc = situation["situation"]["situation_description"]
    target_keyword = determine_target_keyword(desc)

    # Gather all timestamps: start, end, and those in the details.
    timestamps = [situation["situation"]["start_timestamp"],
                  situation["situation"]["end_timestamp"]]
    for detail in situation["situation"]["details"]:
        timestamps.append(detail["timestamp"])

    # Determine if every timestamp is in the target window.
    all_in_window = True
    for ts in timestamps:
        dt = datetime.utcfromtimestamp(ts)
        if not in_target_window(dt, target_keyword):
            all_in_window = False
            break

    if all_in_window:
        # No adjustment is needed.
        return situation

    # Calculate the constant offset based on the first timestamp.
    original_first_ts = situation["situation"]["start_timestamp"]
    dt_first = datetime.utcfromtimestamp(original_first_ts)
    target_dt_first = get_target_base_time(dt_first, target_keyword)
    offset = target_dt_first - dt_first

    # Apply the offset to the start and end timestamps.
    situation["situation"]["start_timestamp"] = int(original_first_ts + offset.total_seconds())
    situation["situation"]["end_timestamp"] = int(situation["situation"]["end_timestamp"] + offset.total_seconds())

    # Apply the offset to each detail timestamp.
    for detail in situation["situation"]["details"]:
        detail["timestamp"] = int(detail["timestamp"] + offset.total_seconds())

    return situation

def main():
    input_file = 'data/all_data.json'
    output_file = 'data/adjusted_data.json'

    # Read the JSON data from the input file.
    with open(input_file, "r") as infile:
        data = json.load(infile)

    adjusted_data = []
    for situation in data:
        # Process only situations with a "normal" estimate.
        if situation.get("estimate") == "normal":
            situation = adjust_timestamps(situation)
        adjusted_data.append(situation)

    # Write the adjusted data back to the output file.
    with open(output_file, "w") as outfile:
        json.dump(adjusted_data, outfile, indent=4)

if __name__ == "__main__":
    main()
