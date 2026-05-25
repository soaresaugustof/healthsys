import numpy as np


class KNN:
    def __init__(self, k: int = 5, task: str = "classification", distance: str = "euclidean"):
        self.k = k
        self.task = task
        self.distance = distance
        self.X_train = None
        self.y_train = None

    @staticmethod
    def euclidean_distance(x1: np.ndarray, x2: np.ndarray) -> float:
        return np.sqrt(np.sum((x1 - x2) ** 2))

    @staticmethod
    def manhattan_distance(x1: np.ndarray, x2: np.ndarray) -> float:
        return np.sum(np.abs(x1 - x2))

    def fit(self, X_train: np.ndarray, y_train: np.ndarray):
        self.X_train = X_train
        self.y_train = y_train

    def _distance(self, x1: np.ndarray, x2: np.ndarray) -> float:
        if self.distance == "euclidean":
            return self.euclidean_distance(x1, x2)
        if self.distance == "manhattan":
            return self.manhattan_distance(x1, x2)
        raise ValueError("distância deve ser 'euclidean' ou 'manhattan'")

    @staticmethod
    def _vote(labels):
        unique, counts = np.unique(labels, return_counts=True)
        return unique[np.argmax(counts)]

    def _distances_to_all(self, x: np.ndarray) -> np.ndarray:
        if self.distance == "euclidean":
            return np.sqrt(np.sum((self.X_train - x) ** 2, axis=1))
        if self.distance == "manhattan":
            return np.sum(np.abs(self.X_train - x), axis=1)
        raise ValueError("distância deve ser 'euclidean' ou 'manhattan'")

    def _predict_single(self, x: np.ndarray):
        distances = self._distances_to_all(x)
        k_indices = np.argsort(distances)[: self.k]
        k_nearest_labels = [self.y_train[i] for i in k_indices]

        if self.task == "classification":
            return self._vote(k_nearest_labels)
        if self.task == "regression":
            return np.mean(k_nearest_labels)
        raise ValueError("task deve ser 'classification' ou 'regression'")

    def predict(self, X_test: np.ndarray) -> np.ndarray:
        return np.array([self._predict_single(x) for x in X_test])
