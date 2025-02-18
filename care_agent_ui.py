import logging
import queue
import threading
import time
import gradio as gr
from gradio_modal import Modal
from care_agent_framework import CareAgentFramework
from agents.situations import Investigation, Situation
from log_utils import reformat
import plotly.graph_objects as go
from datetime import datetime
import json

TIMEZONE = datetime.now().astimezone().tzinfo

class QueueHandler(logging.Handler):
    def __init__(self, log_queue):
        super().__init__()
        self.log_queue = log_queue

    def emit(self, record):
        self.log_queue.put(self.format(record))


def html_for(log_data):
    output = '<br>'.join(log_data[-18:])
    return f"""
    <div id="scrollContent" style="height: 400px; overflow-y: auto; border: 1px solid #ccc; background-color: #d3d3d3; padding: 10px;">
    {output}
    </div>
    """


def setup_logging(log_queue):
    handler = QueueHandler(log_queue)
    formatter = logging.Formatter(
        "[%(asctime)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S %z",
    )
    handler.setFormatter(formatter)
    logger = logging.getLogger()
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class App:

    def __init__(self):    
        self.agent_framework = None

    def get_agent_framework(self):
        if not self.agent_framework:
            self.agent_framework = CareAgentFramework()
        return self.agent_framework

    def run(self):
        with gr.Blocks(title="The Care Agent", fill_width=True) as ui:

            log_data = gr.State([])

            # Modal for showing situation details
            with Modal(visible=False) as details_modal:
                gr.Markdown("### Situation Details")
                details_text = gr.Textbox(label="Details", interactive=False, lines=10)
                gr.Button("Close").click(lambda: Modal(visible=False), None, details_modal)

            def show_details(index):
                # Get the details for the selected situation
                investigations = self.get_agent_framework().memory
                print(f"show_details called with index: {index}")
                if index and index != 'undefined':
                    index = int(index)
                    if index < len(investigations):
                        details = investigations[index].situation.details
                        # Format details nicely for display
                        details_str = "\n".join(details)
                        print(f"Showing details for index: {index}")
                        return Modal(visible=False), details_str, Modal(visible=True)
                print("No details to show or invalid index")
                return Modal(visible=False), "", Modal(visible=False)
    
            def table_for(invs):
                result_table = []
                for inv in invs:
                    row = [
                        inv.situation.situation_description,
                        inv.situation.result,
                        f"{datetime.fromtimestamp(inv.situation.start_timestamp, tz=TIMEZONE)}",
                        f"{datetime.fromtimestamp(inv.situation.end_timestamp, tz=TIMEZONE)}",
                        inv.situation.start_timestamp,
                        inv.situation.end_timestamp,
                        inv.estimate #this is the estimated value (adjusted by human reenforced learning)
                    ]
                    result_table.append(row)
                return result_table

            def update_output(log_data, log_queue, result_queue):
                initial_result = table_for(self.get_agent_framework().memory)
                final_result = None
                while True:
                    try:
                        message = log_queue.get_nowait()
                        log_data.append(reformat(message))
                        yield log_data, html_for(log_data), final_result or initial_result
                    except queue.Empty:
                        try:
                            final_result = result_queue.get_nowait()
                            yield log_data, html_for(log_data), final_result or initial_result
                        except queue.Empty:
                            if final_result is not None:
                                break
                            time.sleep(0.5)


            def get_plot():
                # Process data to count the number of anomalous situations per day
                investigations = self.get_agent_framework().memory
                anomalous_counts = {}
                
                for inv in investigations:
                    if inv.estimate == "anomalous":
                        date = datetime.fromtimestamp(inv.situation.start_timestamp, tz=TIMEZONE).date()
                        if date not in anomalous_counts:
                            anomalous_counts[date] = 0
                        anomalous_counts[date] += 1
                
                # Prepare data for the bar chart
                dates = [date.strftime('%Y-%m-%d') for date in anomalous_counts.keys()]
                counts = list(anomalous_counts.values())
                
                # Create the bar chart
                fig = go.Figure(data=[go.Bar(x=dates, y=counts)])
                fig.update_layout(
                    title='Number of Anomalous Situations per Day',
                    xaxis_title='Date',
                    yaxis_title='Number of Anomalous Situations',
                    height=400,
                )
                return fig

            def do_run():
                new_investigations = self.get_agent_framework().run()
                table = table_for(new_investigations)
                return table

            def run_with_logging(initial_log_data):
                log_queue = queue.Queue()
                result_queue = queue.Queue()
                setup_logging(log_queue)
                
                def worker():
                    result = do_run()
                    result_queue.put(result)
                
                thread = threading.Thread(target=worker)
                thread.start()
                
                for log_data, output, final_result in update_output(initial_log_data, log_queue, result_queue):
                    yield log_data, output, create_html_table(final_result), get_plot()
           

            def handle_dropdown_change(value):
                print("Dropdown change handler called with value:", value)
                try:
                    data = json.loads(value)
                    index = data["index"]
                    estimate = data["value"]

                    investigations = self.get_agent_framework().memory
                    investigation = investigations[index]

                    # setting the estimate (human reenforced learning)
                    investigation.estimate = estimate

                    if estimate == "anomalous":
                        print(f"Marking investigation {index} as anomalous")
                    else:
                        print(f"Marking investigation {index} as normal")

                    self.get_agent_framework().update_memory(index, investigation)

                    # Update the table and plot
                    updated_table = create_html_table(table_for(investigations))
                    updated_plot = get_plot()
                    return updated_table, updated_plot
                except Exception as e:
                    return create_html_table(table_for([])), get_plot()

            def create_html_table(data):
                table_html = """
                <table style="width:100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #ddd; padding: 8px;">Description</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">Result</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">Start Time</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">End Time</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">Start Timestamp</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">End Timestamp</th>
                            <th style="border: 1px solid #ddd; padding: 8px;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                """
                for idx, row in enumerate(data):
                    estimate = row[6]  # Estimate field

                    if estimate == "anomalous": #only include rows that are not normal                    
                        selected_normal = "selected" if estimate == "normal" else ""
                        selected_anomalous = "selected" if estimate == "anomalous" else ""

                        # Add a row with a clickable event
                        table_html += f"""
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;" onclick="window.showDetails({idx})">{row[0]}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">{row[1]}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">{row[2]}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">{row[3]}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">{row[4]}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">{row[5]}</td>
                            <td style="border: 1px solid #ddd; padding: 8px;">
                                <select 
                                    onchange="window.handleDropdownChange(this.value, {idx})"
                                    data-row-index="{idx}"
                                >
                                    <option value="normal" {selected_normal}>Normal</option>
                                    <option value="anomalous" {selected_anomalous}>Anomalous</option>
                                </select>
                            </td>
                        </tr>
                        """
                table_html += """
                    </tbody>
                </table>
                """
                return table_html
            
            with gr.Row():
                gr.Markdown('<div style="text-align: center;font-size:24px">"The Care Agent" - Smarthome Agentic AI</div>')
            with gr.Row():
                gr.Markdown('<div style="text-align: center;font-size:14px">Autonomous agent framework that detects issues with Elderly people, collaborating with a proprietary fine-tuned LLM deployed on Modal, and a RAG pipeline with a frontier model and Chroma.</div>')

            with gr.Row():
                with gr.Column(scale=1):
                    logs = gr.HTML()
                with gr.Column(scale=1):
                    plot = gr.Plot(value=get_plot(), show_label=False)

            with gr.Row():
                investigations_html = gr.HTML()

            dropdown_data = gr.Textbox(elem_id="dropdown-data-input", visible=True)
            #result_text = gr.Textbox(visible=False)

            dropdown_data.change(
                fn=handle_dropdown_change,
                inputs=[dropdown_data],
                outputs=[investigations_html, plot]
            )

            ui.load(run_with_logging, inputs=[log_data], outputs=[log_data, logs, investigations_html, plot])

            # JavaScript to trigger modal display on row click
            ui.load(
                None, None, None,
                js="""
                window.showDetails = function(index) {
                    console.log(`showDetails called with index: ${index}`);
                    const textbox = document.querySelector("#details-index-input textarea");
                    console.log("textbox:", textbox);
                    if (textbox) {
                        // Force value change by setting to empty string first
                        textbox.value = "";
                        const event = new Event("input", { bubbles: true });
                        textbox.dispatchEvent(event);

                        // Set the actual index value
                        setTimeout(() => {
                            textbox.value = index;
                            const event = new Event("input", { bubbles: true });
                            textbox.dispatchEvent(event);
                        }, 100);
                    }
                }
                """
            )
            
            # Hidden Textbox to bridge JS -> Gradio
            details_index = gr.Textbox(elem_id="details-index-input", visible=False)
            
            # When index changes, open the modal and show the details
            details_index.change(
                fn=show_details,
                inputs=[details_index],
                outputs=[details_modal, details_text, details_modal]
            )

            ui.load(
                None, None, None,
                js="""
                window.handleDropdownChange = function(value, index) {
                    const data = JSON.stringify({ index: index, value: value });
                    const textbox = document.querySelector("#dropdown-data-input textarea");
                    if (textbox) {
                        textbox.value = data;
                        const event = new Event("input", { bubbles: true });
                        textbox.dispatchEvent(event);
                        console.log(`Event dispatched with data: ${data}`);
                    } else {
                        console.error("Could not find the textarea element for dropdown-data-input.");
                    }
                }
                """
            )

            timer = gr.Timer(value=30, active=True)
            timer.tick(run_with_logging, inputs=[log_data], outputs=[log_data, logs, investigations_html, plot])

        ui.launch(share=False, inbrowser=True)

if __name__ == "__main__":
    App().run()
