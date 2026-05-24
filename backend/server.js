require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

connectDB();

app.use(cors());
// Increase request body size limits to allow base64 image payloads from frontend
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const path = require("path");
// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/ai", require("./routes/aiRoutes"));
app.use("/api/pets", require("./routes/petRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/find-vets", require("./routes/findVets"));
app.use("/api/find-creches", require("./routes/findCreches"));
app.use("/api/grok", require("./routes/grokRoutes"));

app.listen(5000, () => console.log("Server Running on 5000"));
