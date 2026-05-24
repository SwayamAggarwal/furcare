const axios = require("axios");
const FormData = require("form-data");

exports.predictPet = async (req, res) => {
  try {
    const formData = new FormData();

    // Validate files
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      console.error("AI ERROR: no files uploaded", req.files);
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Append uploaded images correctly
    req.files.forEach((file) => {
      formData.append("files", file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
    });

    const response = await axios.post(
      "http://127.0.0.1:8000/predict",
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    res.json(response.data);

  } catch (error) {
    // Log more detailed error info to help debugging
    console.error("AI ERROR:", {
      message: error.message,
      stack: error.stack,
      responseData: error.response ? error.response.data : undefined,
    });
    res.status(500).json({ error: "AI prediction failed" });
  }
};
