import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import keras
import tensorflow as tf
import numpy as np
from tensorflow.keras.utils import load_img, img_to_array
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import load_model
import matplotlib.pyplot as plt

labels = ['Atelectasis', 'Cardiomegaly', 'Consolidation', 'Edema', 'Effusion',
       'Emphysema', 'Fibrosis', 'Hernia', 'Infiltration', 'Mass', 'Nodule',
       'Pleural Thickening', 'Pneumonia', 'Pneumothorax', 'Pneumoperitoneum',
       'Pneumomediastinum', 'Subcutaneous Emphysema', 'Tortuous Aorta',
       'Calcification of the Aorta']

def preprocess_image_with_generator(img_path, target_size=(320, 320)):
    image_generator = ImageDataGenerator(
        samplewise_center=True,
        samplewise_std_normalization=True
    )
    img = load_img(img_path, target_size=target_size)
    img_array = img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = image_generator.standardize(img_array)
    return img_array

def weighted_loss(pos_weights, neg_weights, epsilon=1e-7):
    def loss(y_true, y_pred):
        y_true = tf.cast(y_true, tf.float32)
        y_pred = tf.cast(y_pred, tf.float32)
        loss = 0.0
        pos_weights_tensor = tf.convert_to_tensor(pos_weights, dtype=tf.float32)
        neg_weights_tensor = tf.convert_to_tensor(neg_weights, dtype=tf.float32)
        for i in range(len(pos_weights)):
            class_loss = -(
                pos_weights_tensor[i] * y_true[:, i] * tf.math.log(y_pred[:, i] + epsilon) +
                neg_weights_tensor[i] * (1 - y_true[:, i]) * tf.math.log(1 - y_pred[:, i] + epsilon)
            )
            loss += tf.reduce_mean(class_loss)
        return loss
    return loss
