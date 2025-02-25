# AI Agents - Care Agent

## Overview

The Care Agent project is designed to monitor and analyze the daily activities of elderly individuals using sensor data. The system detects anomalies in movement patterns and provides insights to ensure their safety and well-being. The project leverages various agents, including a Random Forest Agent and a Scanner Agent, to process and analyze the data.

## Features

- **Data Collection**: Collects sensor data from various rooms in the house.
- **Anomaly Detection**: Identifies unusual patterns in the movement and activities of the elderly.
- **Logging and Visualization**: Provides detailed logs and visualizations of the detected anomalies.
- **Human Reinforcement Learning**: Allows human intervention to mark situations as normal or anomalous.

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

### Setup

1. **Clone the Repository**

    ```bash
    git clone https://github.com/oidebrett/careagent.git
    cd careagent
    ```

2. **Create a Virtual Environment**

    ```bash
    python3 -m venv .venv
    source .venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3. **Install Dependencies**

    ```bash
    pip install --upgrade pip
    pip install -r requirements.txt
    ```

3.1 ***Issues with PyArrow Installation on MacOS

If you encounter issues installing `pyarrow` on macOS, especially errors related to `CMake` or missing `ArrowConfig.cmake`, follow these steps:

Ensure your `pip`, `setuptools`, and `wheel` are up to date:
```bash
   pip install --upgrade pip setuptools wheel
```
Install PyArrow Without Build Isolation
Use the following command to install pyarrow while avoiding build issues:

``` bash
pip install --no-build-isolation --no-cache-dir pyarrow
```
Install Missing Dependencies (If Needed)
If the installation fails due to missing modules (e.g., Cython), install them manually:

``` bash
pip install cython
```


4. **Set Up Environment Variables**

    Create a `.env` file in the project root directory and add your API keys:

    ```plaintext
    OPENAI_API_KEY=your_openai_api_key
    GOOGLE_API_KEY=your_google_api_key
    ANTHROPIC_API_KEY=your_anthropic_api_key
    HF_TOKEN=your_huggingface_token
    ```

5. **Run the Application**

    ```bash
    python care_agent_ui.py
    ```

6. Playground

If you would like to experiment with various models including local ones you will need to install ollama

    ```bash
    curl -fsSL https://ollama.com/install.sh | sh
    ```


## Usage

### Running the Care Agent

1. **Start the Application**

    Navigate to the project root directory and run:

    ```bash
    python care_agent_ui.py
    ```

2. **Access the UI**

    Open your web browser and go to `http://localhost:7860` to access the Care Agent UI.

3. **Monitor and Analyze**

    - Use the UI to monitor the daily activities of the elderly.
    - Review the detected anomalies and provide feedback to improve the system.

## Project Structure

- `careagent`: Contains the main application code.
  - `agents/`: Contains the agent implementations.
  - `data/`: Contains the data files.
- `requirements.txt`: Lists the Python dependencies.
- `README.md`: This file.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License.

## Contact

For any questions or issues, please contact [ivo.brett@gmail.com](mailto:ivo.brett@gmail.com).
