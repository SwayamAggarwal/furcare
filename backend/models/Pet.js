const mongoose = require("mongoose");

const petSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: String,
  animal: String,
  breed: String,
  breedSource: String, // "ai" or "manual"
  confidence: Number,
  age: Number,
  weight: Number,
  gender: String,
  // Optional list of allergies (e.g. ['pollen', 'chicken'])
  allergies: [String],
  isLost: { type: Boolean, default: false },
  // When a pet is reported lost, store the last-known location
  lostLocation: {
    lat: Number,
    lng: Number,
    at: Date
  },
  // Owner contact info
  ownerName: String,
  ownerPhone: Number,
  ownerAddress: String,
  // Stored image URLs (served from /uploads)
  ownerPhoto: String,
  petPhoto: String,
  petPhotos: [String],
  ownerAge: Number,
  ownerGender: String,
  ownerPasswordHash: String,
  qrCode: String
});

module.exports = mongoose.model("Pet", petSchema);
