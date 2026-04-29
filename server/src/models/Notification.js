const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["ticket_created", "new_message", "status_changed"],
      required: true,
    },
    data: {
      ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
      title: String,
      messageSnippet: String,
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
