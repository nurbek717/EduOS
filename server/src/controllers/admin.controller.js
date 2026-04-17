const User = require("../models/User");
const School = require("../models/School");
const Subscription = require("../models/Subscription");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const ParentModel = require("../models/Parent");

function fail(res, req, statusCode, message) {
  return res.status(statusCode).json({
    message,
    requestId: req.id || null,
  });
}

const listUsers = async (req, res) => {
  try {
    const { role, search } = req.query;

    const query = {
      role: { $ne: "super_admin" },
    };

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .populate("school", "name")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return res.json(
      users.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.school ? user.school._id : null,
        schoolName: user.school ? user.school.name : null,
        createdAt: user.createdAt,
      })),
    );
  } catch (err) {
    return fail(res, req, 500, err.message || "Failed to load users");
  }
};

const getStats = async (req, res) => {
  try {
    const rawWeekOffset = Number.parseInt(req.query.weekOffset ?? "0", 10);
    const weekOffset = Number.isNaN(rawWeekOffset) || rawWeekOffset < 0 ? 0 : Math.min(rawWeekOffset, 52);

    const formatDay = (date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const [totalSchools, totalUsers, directors, schoolAdmins, teachers, students, parents, directorSchoolIds, schoolAdminSchoolIds, schoolsWithoutDirector] = await Promise.all([
      School.countDocuments(),
      User.countDocuments(),
      User.countDocuments({ role: "director" }),
      User.countDocuments({ role: "school_admin" }),
      User.countDocuments({ role: "teacher" }),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "parent" }),
      School.distinct("_id", { director: { $ne: null } }),
      User.distinct("school", { role: "school_admin", school: { $ne: null } }),
      School.countDocuments({ director: null }),
    ]);

    const activeSchools = new Set([
      ...directorSchoolIds.map((schoolId) => String(schoolId)),
      ...schoolAdminSchoolIds.map((schoolId) => String(schoolId)),
    ]).size;
    const schoolsWithSchoolAdmin = new Set(schoolAdminSchoolIds.map((schoolId) => String(schoolId))).size;
    const schoolsWithoutSchoolAdmin = Math.max(totalSchools - schoolsWithSchoolAdmin, 0);

    // Tanlangan hafta oralig'i bo'yicha yangi maktablar (mahalliy kunlar bo'yicha)
    // end: tanlangan haftaning oxirgi kuni (bugungi kun - 7 * weekOffset)
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() - weekOffset * 7);

    // start: shu haftaning boshidan (7 kun orqaga, shu jumladan end kuni)
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const startDay = formatDay(start); // YYYY-MM-DD
    const endDay = formatDay(end);

    const rawLast7Days = await School.aggregate([
      {
        $match: {
          created_day_local: {
            $gte: startDay,
            $lte: endDay,
          },
        },
      },
      {
        $group: {
          _id: "$created_day_local",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const countsByDate = rawLast7Days.reduce((acc, item) => {
      return {
        ...acc,
        [item._id]: item.count,
      };
    }, {});

    const schoolsLast7Days = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = formatDay(d); // YYYY-MM-DD
      schoolsLast7Days.push({
        date: key,
        count: countsByDate[key] || 0,
      });
    }

    const newSchoolsLast7Days = schoolsLast7Days.reduce((total, item) => total + item.count, 0);
    const attentionItems = [];

    if (schoolsWithoutDirector > 0) {
      attentionItems.push(`${schoolsWithoutDirector} ta maktabda direktor biriktirilmagan.`);
    }
    if (schoolsWithoutSchoolAdmin > 0) {
      attentionItems.push(`${schoolsWithoutSchoolAdmin} ta maktabda maktab admini yo'q.`);
    }
    if (Math.max(totalSchools - activeSchools, 0) > 0) {
      attentionItems.push(`${Math.max(totalSchools - activeSchools, 0)} ta maktabda faollik past yoki boshqaruv to'liq emas.`);
    }

    // Direktorsiz maktablar orasida obunasi bor maktablar va tugash sanasini qaytaramiz
    // (front-end "necha kun qoldi" ni real hisoblaydi).
    let schoolsWithoutDirectorSubscriptions = [];
    if (schoolsWithoutDirector > 0) {
      const directorslessSchools = await School.find({ director: null })
        .select("_id name")
        .lean()
        .exec();

      const schoolIds = directorslessSchools.map((s) => s._id);
      if (schoolIds.length > 0) {
        const subs = await Subscription.find({ school: { $in: schoolIds } })
          .select("school endAt")
          .lean()
          .exec();

        const schoolNameById = directorslessSchools.reduce((acc, s) => {
          acc[String(s._id)] = s.name;
          return acc;
        }, {});

        schoolsWithoutDirectorSubscriptions = subs
          .map((sub) => ({
            schoolId: String(sub.school),
            schoolName: schoolNameById[String(sub.school)] || "Maktab",
            endAt: sub.endAt,
          }))
          .sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime());
      }
    }

    return res.json({
      totalSchools,
      totalUsers,
      byRole: {
        director: directors,
        school_admin: schoolAdmins,
        teacher: teachers,
        student: students,
        parent: parents,
      },
      schoolsByStatus: {
        active: activeSchools,
        inactive: Math.max(totalSchools - activeSchools, 0),
      },
      platformOverview: {
        schoolsWithoutDirector,
        schoolsWithoutDirectorSubscriptions,
        schoolsWithoutSchoolAdmin,
        newSchoolsLast7Days,
        attentionItems,
      },
      schoolsLast7Days,
      range: {
        start: startDay,
        end: endDay,
        weekOffset,
      },
    });
  } catch (err) {
    return fail(res, req, 500, err.message || "Failed to load statistics");
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate("school", "name");
    if (!user) {
      return fail(res, req, 404, "User not found");
    }
    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.school ? user.school._id : null,
      schoolName: user.school ? user.school.name : null,
    });
  } catch (err) {
    return fail(res, req, 500, err.message || "Failed to load user");
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return fail(res, req, 404, "User not found");
    }
    if (user.role === "super_admin") {
      return fail(res, req, 400, "Super admin cannot be modified from this endpoint");
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = password;

    await user.save();

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    return fail(res, req, 500, err.message || "Failed to update user");
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return fail(res, req, 404, "User not found");
    }
    if (user.role === "super_admin") {
      return fail(res, req, 400, "Super admin cannot be deleted");
    }

    if (user.role === "teacher") {
      await Teacher.deleteMany({ user: user._id });
    }
    if (user.role === "student") {
      await Student.deleteMany({ user: user._id });
    }
    if (user.role === "parent") {
      await ParentModel.deleteMany({ user: user._id });
    }
    if (user.role === "director") {
      await School.updateMany({ director: user._id }, { $unset: { director: "" } });
    }

    await User.deleteOne({ _id: user._id });

    return res.json({ success: true });
  } catch (err) {
    return fail(res, req, 500, err.message || "Failed to delete user");
  }
};

const createOrExtendSubscription = async (req, res) => {
  const { schoolId, days } = req.body;

  try {
    const school = await School.findById(schoolId);
    if (!school) {
      return fail(res, req, 404, "Maktab topilmadi");
    }

    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = new Date();

    const existing = await Subscription.findOne({ school: schoolId }).exec();

    if (existing) {
      // Agar oldingi obuna hali tugamagan bo'lsa, qolgan muddatga qo'shib uzaytiramiz.
      const base = existing.endAt && existing.endAt.getTime() > now.getTime() ? existing.endAt : now;
      existing.endAt = new Date(base.getTime() + days * DAY_MS);
      await existing.save();

      return res.json({
        id: existing._id,
        schoolId: school._id,
        schoolName: school.name,
        endAt: existing.endAt,
      });
    }

    const created = await Subscription.create({
      school: school._id,
      endAt: new Date(now.getTime() + days * DAY_MS),
    });

    return res.status(201).json({
      id: created._id,
      schoolId: school._id,
      schoolName: school.name,
      endAt: created.endAt,
    });
  } catch (err) {
    return fail(res, req, 500, err.message || "Obunani qo'shishda xatolik");
  }
};

const listSubscriptions = async (req, res) => {
  try {
    const subs = await Subscription.find()
      .populate("school", "name")
      .sort({ endAt: 1 })
      .lean()
      .exec();

    return res.json(
      subs.map((s) => ({
        id: s._id,
        schoolId: s.school?._id ?? null,
        schoolName: s.school?.name ?? "Maktab",
        createdAt: s.created_at || null,
        endAt: s.endAt,
      })),
    );
  } catch (err) {
    return fail(res, req, 500, err.message || "Obunalar ro'yxatini yuklashda xatolik");
  }
};

module.exports = {
  listUsers,
  getStats,
  getUser,
  updateUser,
  deleteUser,
  createOrExtendSubscription,
  listSubscriptions,
};

