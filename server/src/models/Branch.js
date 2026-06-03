const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
  name: { type: String, required: true, trim: true },
  address: { type: String, default: "", trim: true },
  managerUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

branchSchema.index({ school: 1, name: 1 });

module.exports = mongoose.model("SchoolBranch", branchSchema);
