const express = require("express");
const multer = require("multer");
const { predictPet } = require("../controllers/aiController");

const upload = multer();
const router = express.Router();

// Frontend sends files under the `files` field name, so accept that here
router.post("/predict", upload.array("files"), predictPet);

module.exports = router;
