const mongoose = require("mongoose");

const connectDb = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/school_saas";
  try {
    await mongoose.connect(uri, {
      autoIndex: true,
    });
    // eslint-disable-next-line no-console
    console.log("MongoDB connected");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("MongoDB connection error:", err?.message || err);
    // eslint-disable-next-line no-console
    console.error(
      [
        "Tekshirish ro‘yxati:",
        "- MONGODB_URI to‘g‘rimi? (server/.env)",
        "- MongoDB Atlas bo‘lsa: Network Access da IP (0.0.0.0/0 yoki sizning IP) ochiqmi?",
        "- Local mongod ishlayaptimi: mongodb://localhost:27017/...",
        "- Internet / VPN ulanishi",
      ].join("\n"),
    );
    throw new Error("MongoDB connection error");
  }
};

module.exports = connectDb;

