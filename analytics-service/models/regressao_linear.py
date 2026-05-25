import numpy as np


class RegressaoLinear:

    def __init__(self):
        self._coef = None

    def fit(self, X_train: np.ndarray, y_train: np.ndarray):
        X_b = np.column_stack([np.ones(len(X_train)), X_train])
        self._coef, _, _, _ = np.linalg.lstsq(X_b, y_train, rcond=None)

    def predict(self, X_test: np.ndarray) -> np.ndarray:
        X_b = np.column_stack([np.ones(len(X_test)), X_test])
        return X_b @ self._coef
