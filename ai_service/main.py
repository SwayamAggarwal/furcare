from fastapi import FastAPI, UploadFile, File
from typing import List
import numpy as np
from PIL import Image
import io
import keras

app = FastAPI()


import tensorflow as tf

binary_model = tf.keras.models.load_model(
    "models/animal_classifier_dog_cat.keras",
    compile=False
)

dog_model = tf.keras.models.load_model(
    "models/dog_breed_classifier.keras",
    compile=False
)

cat_model = tf.keras.models.load_model(
    "models/cat_breed_classifier_v3.keras",
    compile=False
)


dog_classes = np.load("models/dog_breed_classes.npy")
cat_classes = np.load("models/cat_breed_classes.npy")

@app.post("/predict")
async def predict(files: List[UploadFile] = File(...)):
    images = []

    for file in files:
        img = Image.open(io.BytesIO(await file.read())).convert("RGB")
        img = img.resize((224, 224))
        img = np.array(img)
        img = tf.keras.applications.mobilenet_v3.preprocess_input(img)
        images.append(img)

    images = np.array(images)

    species_preds = binary_model.predict(images)
    avg_species = np.mean(species_preds, axis=0)
    animal_idx = np.argmax(avg_species)

    if animal_idx == 0:
        breed_preds = dog_model.predict(images)
        classes = dog_classes
        animal = "Dog"
    else:
        breed_preds = cat_model.predict(images)
        classes = cat_classes
        animal = "Cat"

    avg_breed = np.mean(breed_preds, axis=0)
    top3_idx = np.argsort(avg_breed)[-3:][::-1]

    return {
        "animal": animal,
        "breed": classes[top3_idx[0]],
        "confidence": float(avg_breed[top3_idx[0]]),
        "top3": [
            {"breed": classes[i], "confidence": float(avg_breed[i])}
            for i in top3_idx
        ]
    }
