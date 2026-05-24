const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('MongoDB connection string (MONGO_URI) is not set in .env');
      return;
    }
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected");
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err && err.message ? err.message : err);
    // rethrow so server startup can handle it if needed
    throw err;
  }
};

module.exports = connectDB;
