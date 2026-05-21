const { authenticateUser, getUserById } = require("./auth.service");

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const result = await authenticateUser(email, password);
    if (!result) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  login,
  me,
};
