import tensorflow as tf

# -------- Binary Model --------
binary_model = tf.keras.models.load_model(
    "models/animal_classifier_dog_cat.keras",
    compile=False
)

binary_model.save("models/animal_classifier_dog_cat.h5")
print("Binary model converted.")

# -------- Dog Breed Model --------
dog_model = tf.keras.models.load_model(
    "models/dog_breed_classifier.keras",
    compile=False
)

dog_model.save("models/dog_breed_classifier.h5")
print("Dog breed model converted.")

# -------- Cat Breed Model --------
cat_model = tf.keras.models.load_model(
    "models/cat_breed_classifier_v3.keras",
    compile=False
)

cat_model.save("models/cat_breed_classifier.h5")
print("Cat breed model converted.")

print("\nAll models successfully converted to H5.")
