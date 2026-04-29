const mongoose = require("mongoose");

const FINANCE_TRANSACTION_TYPES = ["income", "expense"];
const FINANCE_TRANSACTION_CATEGORIES = [
  "student_fee",
  "salary",
  "donation",
  "grant",
  "other_income",
  "utilities",
  "maintenance",
  "supplies",
  "tax",
  "bonus",
  "other_expense",
];

const financeTransactionSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    type: { type: String, enum: FINANCE_TRANSACTION_TYPES, required: true, index: true },
    category: { type: String, enum: FINANCE_TRANSACTION_CATEGORIES, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    occurredAt: { type: Date, required: true, index: true },
    description: { type: String, trim: true, default: null },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null, index: true },
    staffUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

financeTransactionSchema.index({ school: 1, occurredAt: -1 });

module.exports = mongoose.model("FinanceTransaction", financeTransactionSchema);
module.exports.FINANCE_TRANSACTION_TYPES = FINANCE_TRANSACTION_TYPES;
module.exports.FINANCE_TRANSACTION_CATEGORIES = FINANCE_TRANSACTION_CATEGORIES;
