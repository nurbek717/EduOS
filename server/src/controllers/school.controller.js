const School = require("../models/School");
const User = require("../models/User");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Parent = require("../models/Parent");
const Subscription = require("../models/Subscription");
const ClassModel = require("../models/Class");
const Subject = require("../models/Subject");
const Grade = require("../models/Grade");
const Attendance = require("../models/Attendance");
const Homework = require("../models/Homework");
const Timetable = require("../models/Timetable");
const FinanceTransaction = require("../models/FinanceTransaction");

function fail(res, req, statusCode, message) {
  return res.status(statusCode).json({
    message,
    requestId: req.id || null,
  });
}

// Create school + optional director user
const createSchool = async (req, res) => {
  const { name, address, phone, directorName, directorEmail, directorPassword } = req.body;

  if (!name) {
    return fail(res, req, 400, "School name is required");
  }

  try {
    if (directorEmail && directorPassword && directorName) {
      const existing = await User.findOne({ email: directorEmail });
      if (existing) {
        return fail(res, req, 400, "Director email already in use");
      }
    }

    const createdSchool = await School.create({
      name,
      address,
      phone,
    });
    let directorUser = null;

    if (directorEmail && directorPassword && directorName) {
      // Bu joyga faqat email bo'sh bo'lsa keladi
      // (yuqorida existing bo'lsa 400 qaytarib yubordik)

      directorUser = await User.create({
        name: directorName,
        email: directorEmail,
        password: directorPassword,
        role: "director",
        school: createdSchool._id,
      });
      createdSchool.director = directorUser._id;
      await createdSchool.save();
    }

    return res.status(201).json({
      school: createdSchool,
      director: directorUser
        ? {
            id: directorUser._id,
            name: directorUser.name,
            email: directorUser.email,
          }
        : null,
    });
  } catch (err) {
    return fail(res, req, 400, err.message || "Failed to create school");
  }
};

const listSchools = async (req, res) => {
  try {
    const schools = await School.find().populate("director", "name email").sort({ created_at: -1 }).exec();
    return res.json(schools);
  } catch (err) {
    return fail(res, req, 500, err.message || "Failed to load schools");
  }
};

const assignDirector = async (req, res) => {
  const { id } = req.params;
  const { directorName, directorEmail, directorPassword } = req.body;

  if (!directorName || !directorEmail || !directorPassword) {
    return fail(res, req, 400, "directorName, directorEmail and directorPassword are required");
  }

  try {
    const school = await School.findById(id);
    if (!school) {
      return fail(res, req, 404, "School not found");
    }

    if (school.director) {
      return fail(res, req, 400, "This school already has a director");
    }

    const existing = await User.findOne({ email: directorEmail });
    if (existing) {
      return fail(res, req, 400, "Director email already in use");
    }

    const director = await User.create({
      name: directorName,
      email: directorEmail,
      password: directorPassword,
      role: "director",
      school: school._id,
    });

    school.director = director._id;
    await school.save();
    await school.populate("director", "name email");

    return res.json({
      school,
      director: {
        id: director._id,
        name: director.name,
        email: director.email,
      },
    });
  } catch (err) {
    return fail(res, req, 400, err.message || "Failed to assign director");
  }
};

const deleteSchool = async (req, res) => {
  const { id } = req.params;

  try {
    const school = await School.findById(id);
    if (!school) {
      return fail(res, req, 404, "School not found");
    }

    await Promise.all([
      Subscription.deleteMany({ school: id }),
      FinanceTransaction.deleteMany({ school: id }),
      Attendance.deleteMany({ school: id }),
      Grade.deleteMany({ school: id }),
      Homework.deleteMany({ school: id }),
      Timetable.deleteMany({ school: id }),
      Parent.deleteMany({ school: id }),
      Student.deleteMany({ school: id }),
      Teacher.deleteMany({ school: id }),
      ClassModel.deleteMany({ school: id }),
      Subject.deleteMany({ school: id }),
      User.deleteMany({ school: id }),
    ]);

    await School.findByIdAndDelete(id);

    return res.json({ success: true, message: "School and related data deleted" });
  } catch (err) {
    return fail(res, req, 500, err.message || "Failed to delete school");
  }
};

module.exports = {
  createSchool,
  listSchools,
  assignDirector,
  deleteSchool,
};

