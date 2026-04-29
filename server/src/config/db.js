const mongoose = require("mongoose");

const connectDb = async () => {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/school_saas";
    await mongoose.connect(uri, {
      autoIndex: true,
    });
    // eslint-disable-next-line no-console
    console.log("MongoDB connected");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("MongoDB connection error", err);
    process.exit(1);
  }
};

module.exports = connectDb;

