import math
import matplotlib.pyplot as plt

GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
RESET = "\033[0m"
COLOR_MAP = {"red":RED, "orange": YELLOW, "green": GREEN}

class Tester:

    def __init__(self, predictor, data, title=None, size=20):
        self.predictor = predictor
        self.data = data
        self.title = title or predictor.__name__.replace("_", " ").title()
        self.size = size
        self.guesses = []
        self.truths = []
        self.errors = []
        self.colors = []

    def color_for(self, error, truth):
        if not error:
            return "green"
        else:
            return "red"
    
    def run_datapoint(self, i):
        datapoint = self.data[i]
        guess = self.predictor(datapoint)
        truth = datapoint.result
        error = guess != truth
        color = self.color_for(error, truth)
        details = datapoint.details if len(datapoint.details) <= 40 else datapoint.details[:40]+"..."
        self.guesses.append(guess)
        self.truths.append(truth) 
        self.errors.append(error)
        self.colors.append(color)
        print(f"{COLOR_MAP[color]}{i+1}: Guess: {guess} Truth: {truth:} Error: {error:} Item: {details}{RESET}")

    def chart(self, title):
        actual = self.truths
        predicted = self.guesses

        # Get unique classes
        classes = list(set(actual + predicted))  # Union of unique classes in actual and predicted

        # Initialize the confusion matrix as a dictionary
        confusion_matrix = {true: {pred: 0 for pred in classes} for true in classes}

        # Populate the confusion matrix
        for a, p in zip(actual, predicted):
            confusion_matrix[a][p] += 1

        # Convert the confusion matrix into a 2D list for visualization
        matrix = [[confusion_matrix[true][pred] for pred in classes] for true in classes]

        # Plot the confusion matrix
        plt.figure(figsize=(8, 6))
        plt.imshow(matrix, interpolation='nearest', cmap=plt.cm.Blues)
        plt.title(title)
        plt.colorbar()

        # Add labels
        tick_marks = range(len(classes))
        plt.xticks(tick_marks, classes)
        plt.yticks(tick_marks, classes)
        plt.ylabel('Actual Label')
        plt.xlabel('Predicted Label')

        max_val = max(max(row) for row in matrix) if matrix else 1
        
        # Add text annotations
        for i in range(len(classes)):
            for j in range(len(classes)):
                # Choose white for dark cells and black for lighter cells
                value = matrix[i][j]
                text_color = "white" if value > (max_val * 0.99) else "black"
                plt.text(j, i, value,
                        horizontalalignment="center",
                        color=text_color)

        plt.tight_layout()
        plt.show()


    def report(self):
        average_error = sum(self.errors) / self.size
        hits = sum(1 for color in self.colors if color=="green")
        title = f"{self.title} Error={average_error:,.2f} Hits={hits/self.size*100:.1f}%"
        self.chart(title)

    def run(self):
        self.error = 0
        for i in range(self.size):
            self.run_datapoint(i)
        self.report()

    @classmethod
    def test(cls, function, data):
        cls(function, data, size=len(data)).run()
        #cls(function, data, size=1).run() #uncomment this line when we want to just test