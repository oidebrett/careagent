from typing import Optional, List
from agents.agent import Agent
from agents.situations import LoadedSituation, SituationSelection, Situation, Investigation
from agents.scanner_agent import ScannerAgent
from agents.ensemble_agent import EnsembleAgent
from agents.messaging_agent import MessagingAgent


class PlanningAgent(Agent):

    name = "Planning Agent"
    color = Agent.GREEN

    def __init__(self, collection):
        """
        Create instances of the 3 Agents that this planner coordinates across
        """
        self.log("Planning Agent is initializing")
        self.log(collection)
        self.scanner = ScannerAgent()
        self.ensemble = EnsembleAgent(collection)
        self.messenger = MessagingAgent()
        self.log("Planning Agent is ready")

    def run(self, situation: Situation) -> Investigation:
        """
        Run the workflow for a particular situation:
        :param situation: the situation, summarized from the file
        :returns: an investigation including the result
        """
        self.log("Planning Agent is investigating a potential situation")
        estimate = self.ensemble.estimate(situation)
#        estimate = "anomalous"
        self.log(f"Planning Agent has processed a situation with estimate: {estimate}")
        return Investigation(situation=situation, estimate=estimate)

    def plan(self, memory: List[str] = []) -> Optional[Investigation]:
        """
        Run the full workflow:
        1. Use the ScannerAgent to find situations from data files
        2. Use the EnsembleAgent to estimate them
        3. Use the MessagingAgent to send a notification of situations that are anomalous
        :param memory: a list of URLs that have been surfaced in the past
        :return: an Opportunity if one was surfaced, otherwise None
        """
        self.log("Planning Agent is kicking off a run")
        selection = self.scanner.scan(memory=memory)
        if selection:
            investigations = [self.run(situation) for situation in selection.situations[:5]]
            investigations.sort(key=lambda inv: inv.estimate, reverse=True)
            best = investigations[0]
            self.log(f"Planning Agent has identified the best situation has result ${best.estimate}")
            if best.estimate == "anomalous":
                self.messenger.alert(best)
            self.log("Planning Agent has completed a run")
#            return best if best.estimate == "anomalous" else None
            return best
        return None