const express = require("express");
const {
  createTicket,
  listTickets,
  getTicket,
  updateTicketStatus,
  addMessage,
  listNotifications,
  markNotificationRead,
} = require("../controllers/ticket.controller");
const { authRequired, requireRoles } = require("../middleware/auth.middleware");
const validators = require("../validation/request.validation");

const router = express.Router();

router.use(authRequired);

// Ticket list for both director and admin
router.get("/", requireRoles("director", "school_admin"), listTickets);

// Create ticket (Director only)
router.post("/", requireRoles("director"), validators.createTicket, createTicket);

// Get ticket details and messages
router.get("/:id", requireRoles("director", "school_admin"), validators.idParam, getTicket);

// Update status (Admin only)
router.patch("/:id/status", requireRoles("school_admin"), validators.updateTicketStatus, updateTicketStatus);

// Add message
router.post("/:id/messages", requireRoles("director", "school_admin"), validators.idParam, addMessage);

// Notifications
router.get("/notifications/list", listNotifications);
router.patch("/notifications/:id/read", validators.idParam, markNotificationRead);

module.exports = router;
