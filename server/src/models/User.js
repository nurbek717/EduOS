const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ROLES = ["super_admin", "director", "school_admin", "branch_admin", "teacher", "student", "parent"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: null },
    password: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolBranch", default: null },
    monthlySalary: { type: Number, default: 0, min: 0 },
    // Profil rasmi (Face ID davomat uchun referens sifatida ishlatiladi; URL yoki base64 data URL)
    photoUrl: { type: String, default: null },
    // Yuz descriptor (128 o\'lchamli vektor); face-api.js dan; Face ID solishtirish uchun
    faceDescriptor: { type: [Number], default: null },
  },
  { timestamps: true },
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  const saltRounds = 10;
  this.password = await bcrypt.hash(this.password, saltRounds);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
module.exports.ROLES = ROLES;

