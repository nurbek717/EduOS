const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLES } = require("../../config/saas-roles");

const tenantUserSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", default: null, index: true },
    fullname: { type: String, required: true, trim: true },
    role: { type: String, enum: ROLES, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
  },
  { timestamps: true, collection: "users" },
);

tenantUserSchema.index({ tenantId: 1, role: 1 });

tenantUserSchema.pre("validate", function validateTenantScope() {
  if (this.role !== "super_admin" && !this.tenantId) {
    this.invalidate("tenantId", "tenantId is required for non-super_admin users");
  }
});

tenantUserSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  const saltRounds = 10;
  this.password = await bcrypt.hash(this.password, saltRounds);
});

tenantUserSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("TenantUser", tenantUserSchema);
