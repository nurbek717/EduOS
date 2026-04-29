const Ticket = require("../models/Ticket");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const User = require("../models/User");

const createTicket = async (req, res) => {
  try {
    const { title, description, priority = "medium" } = req.body;
    const { id: userId, schoolId } = req.user;

    if (req.user.role !== "director") {
      return res.status(403).json({ message: "Faqat direktorlar ticket yarata oladi" });
    }

    // Find the school admin to assign to
    const admin = await User.findOne({ school: schoolId, role: "school_admin" });

    const ticket = await Ticket.create({
      title,
      description,
      priority,
      status: "open",
      createdBy: userId,
      assignedTo: admin ? admin._id : null,
      school: schoolId,
    });

    // Create notification for admin
    if (admin) {
      await Notification.create({
        user: admin._id,
        type: "ticket_created",
        data: {
          ticketId: ticket._id,
          title: ticket.title,
          messageSnippet: description.substring(0, 100),
        },
      });
    }

    return res.status(201).json(ticket);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

const listTickets = async (req, res) => {
  try {
    const { schoolId, id: userId, role } = req.user;
    const query = { school: schoolId };

    if (role === "director") {
      query.createdBy = userId;
    } else if (role === "school_admin") {
      query.assignedTo = userId;
    } else {
      return res.status(403).json({ message: "Ruxsat yo'q" });
    }

    const tickets = await Ticket.find(query)
      .populate("createdBy", "name")
      .populate("assignedTo", "name")
      .sort({ updatedAt: -1 })
      .lean();

    return res.json(tickets);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

const getTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolId } = req.user;

    const ticket = await Ticket.findOne({ _id: id, school: schoolId })
      .populate("createdBy", "name role photoUrl")
      .populate("assignedTo", "name role photoUrl")
      .lean();

    if (!ticket) {
      return res.status(404).json({ message: "Ticket topilmadi" });
    }

    const messages = await Message.find({ ticket: id })
      .populate("sender", "name role photoUrl")
      .sort({ createdAt: 1 })
      .lean();

    return res.json({ ...ticket, messages });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { schoolId, id: userId, role } = req.user;

    if (role !== "school_admin") {
      return res.status(403).json({ message: "Faqat adminlar statusni o'zgartira oladi" });
    }

    const ticket = await Ticket.findOneAndUpdate(
      { _id: id, school: schoolId, assignedTo: userId },
      { status },
      { returnDocument: "after" }
    );

    if (!ticket) {
      return res.status(404).json({ message: "Ticket topilmadi yoki ruxsat yo'q" });
    }

    // Notify director
    await Notification.create({
      user: ticket.createdBy,
      type: "status_changed",
      data: {
        ticketId: ticket._id,
        title: ticket.title,
        messageSnippet: `Status ${status} ga o'zgartirildi`,
      },
    });

    return res.json(ticket);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

const addMessage = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const { content } = req.body;
    const { id: userId, schoolId } = req.user;

    const ticket = await Ticket.findOne({ _id: ticketId, school: schoolId });
    if (!ticket) {
      return res.status(404).json({ message: "Ticket topilmadi" });
    }

    const message = await Message.create({
      ticket: ticketId,
      sender: userId,
      content,
    });

    // Notify the other party
    const recipientId = userId.toString() === ticket.createdBy.toString() 
      ? ticket.assignedTo 
      : ticket.createdBy;

    if (recipientId) {
      await Notification.create({
        user: recipientId,
        type: "new_message",
        data: {
          ticketId: ticket._id,
          title: ticket.title,
          messageSnippet: content.substring(0, 100),
        },
      });
    }

    return res.status(201).json(message);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

const listNotifications = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json(notifications);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;
    await Notification.findOneAndUpdate({ _id: id, user: userId }, { isRead: true });
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

module.exports = {
  createTicket,
  listTickets,
  getTicket,
  updateTicketStatus,
  addMessage,
  listNotifications,
  markNotificationRead,
};
