const User = require("../models/User");
const { generateAccessToken, generateRefreshToken, verifyToken } = require("../utils/jwt");

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email }).populate("school").exec();
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return res.json({
    token: accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.school ? user.school._id : null,
      schoolName: user.school ? user.school.name : null,
      schoolAddress: user.school ? user.school.address || null : null,
      photoUrl: user.photoUrl || null,
    },
  });
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "refreshToken is required" });
  }

  try {
    const decoded = verifyToken(refreshToken, "refresh");
    const user = await User.findById(decoded.sub).populate("school").exec();
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const accessToken = generateAccessToken(user);

    return res.json({
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.school ? user.school._id : null,
        schoolName: user.school ? user.school.name : null,
        schoolAddress: user.school ? user.school.address || null : null,
        photoUrl: user.photoUrl || null,
      },
    });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

const me = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const u = await User.findById(req.user.id).select("name email role photoUrl").populate("school", "name address");
  return res.json({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    schoolId: u.school ? u.school._id : null,
    schoolName: u.school ? u.school.name : null,
    schoolAddress: u.school ? u.school.address || null : null,
    photoUrl: u.photoUrl || null,
  });
};

// O'z profilini yangilash (ism, rasm). Talaba o'z rasmini o'zgartira olmaydi — faqat o'qituvchi/direktor.
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { name, email, phone, photoUrl, faceDescriptor, password } = req.body;

    if (name !== undefined && typeof name === "string" && name.trim()) {
      user.name = name.trim();
    }

    if (email !== undefined && typeof email === "string" && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } }).select("_id");
      if (existing) {
        return res.status(409).json({ message: "Bu email allaqachon band" });
      }
      user.email = normalizedEmail;
    }

    if (phone !== undefined) {
      const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
      user.phone = normalizedPhone || null;
    }

    if (password !== undefined) {
      const nextPassword = typeof password === "string" ? password.trim() : "";
      if (nextPassword.length < 6) {
        return res.status(400).json({ message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
      }
      user.password = nextPassword;
    }

    if (photoUrl !== undefined) {
      if (user.role === "student") {
        return res.status(403).json({ message: "O'quvchi o'z profil rasmini o'zgartira olmaydi. O'qituvchi yoki direktor o'rnatadi." });
      }
      user.photoUrl = photoUrl || null;
    }

    if (faceDescriptor !== undefined) {
      if (user.role === "student") {
        return res.status(403).json({ message: "O'quvchi o'z profil rasmini o'zgartira olmaydi." });
      }
      user.faceDescriptor = Array.isArray(faceDescriptor) && faceDescriptor.length === 128 ? faceDescriptor : null;
    }

    await user.save();
    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      photoUrl: user.photoUrl || null,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update profile" });
  }
};

module.exports = {
  login,
  refresh,
  me,
  updateProfile,
};

