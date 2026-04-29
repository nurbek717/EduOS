const ParentModel = require("../models/Parent");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const ClassModel = require("../models/Class");
const Timetable = require("../models/Timetable");
const ParentTeacherThread = require("../models/ParentTeacherThread");
const ParentTeacherMessage = require("../models/ParentTeacherMessage");

const toId = (value) => (value ? value.toString() : "");

const getParentContext = async (user) => {
  const parent = await ParentModel.findOne({ user: user.id }).populate({
    path: "student",
    populate: { path: "class school user", select: "name email class school" },
  });

  if (!parent) {
    throw new Error("Parent profile not found");
  }
  if (!user.schoolId || toId(parent.student?.school?._id || parent.student?.school) !== toId(user.schoolId)) {
    throw new Error("Parent not in this school");
  }

  return parent;
};

const getTeacherContext = async (user) => {
  const teacher = await Teacher.findOne({ user: user.id }).populate("school subject user");
  if (!teacher) {
    throw new Error("Teacher profile not found");
  }
  if (!user.schoolId || toId(teacher.school?._id || teacher.school) !== toId(user.schoolId)) {
    throw new Error("Teacher not in this school");
  }
  return teacher;
};

const listParentChatTargets = async (req, res) => {
  try {
    const parent = await getParentContext(req.user);

    const cls = await ClassModel.findOne({
      _id: parent.student.class?._id || parent.student.class,
      school: req.user.schoolId,
    })
      .populate({
        path: "classTeacher",
        populate: [
          { path: "user", select: "name email" },
          { path: "subject", select: "name" },
        ],
      })
      .lean();

    let resolvedClassTeacher = cls?.classTeacher || null;

    // Fallback: if classTeacher is not assigned yet, pick a teacher from this class timetable.
    if (!resolvedClassTeacher && parent.student?.class) {
      const timetableRow = await Timetable.findOne({
        school: req.user.schoolId,
        class: parent.student.class?._id || parent.student.class,
      })
        .populate({
          path: "teacher",
          populate: [
            { path: "user", select: "name email" },
            { path: "subject", select: "name" },
          ],
        })
        .populate("subject", "name")
        .sort({ dayOfWeek: 1, startTime: 1 })
        .lean();

      if (timetableRow?.teacher) {
        resolvedClassTeacher = {
          ...timetableRow.teacher,
          subject: timetableRow.teacher.subject || timetableRow.subject || null,
        };
      }
    }

    const classTeacher = resolvedClassTeacher
      ? {
          teacherId: resolvedClassTeacher._id,
          teacherName: resolvedClassTeacher.user?.name || "Sinf rahbari",
          teacherEmail: resolvedClassTeacher.user?.email || "",
          subjectName: resolvedClassTeacher.subject?.name || "",
        }
      : null;

    const subjectTeachers = await Teacher.find({ school: req.user.schoolId })
      .populate("user", "name email")
      .populate("subject", "name")
      .lean();

    const subjectRows = subjectTeachers
      .map((t) => ({
        teacherId: t._id,
        teacherName: t.user?.name || "O'qituvchi",
        teacherEmail: t.user?.email || "",
        subjectId: t.subject?._id || null,
        subjectName: t.subject?.name || "Fan",
      }));

    return res.json({
      classTeacher,
      subjectTeachers: subjectRows,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list chat targets" });
  }
};

const listParentThreads = async (req, res) => {
  try {
    const parent = await getParentContext(req.user);

    const threads = await ParentTeacherThread.find({
      school: req.user.schoolId,
      parent: req.user.id,
      student: parent.student._id,
    })
      .populate({ path: "teacher", populate: [{ path: "user", select: "name email" }, { path: "subject", select: "name" }] })
      .populate("subject", "name")
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    return res.json(
      threads.map((t) => ({
        id: t._id,
        targetType: t.targetType,
        teacherId: t.teacher?._id || null,
        teacherName: t.teacher?.user?.name || "O'qituvchi",
        teacherEmail: t.teacher?.user?.email || "",
        subjectName: t.subject?.name || t.teacher?.subject?.name || "",
        lastMessageAt: t.lastMessageAt,
        lastSenderRole: t.lastSenderRole || null,
      })),
    );
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list parent threads" });
  }
};

const createOrGetParentThread = async (req, res) => {
  try {
    const parent = await getParentContext(req.user);
    const { targetType, teacherId, subjectId } = req.body || {};

    if (!["class_teacher", "subject_teacher"].includes(targetType)) {
      return res.status(400).json({ message: "targetType noto'g'ri" });
    }
    if (!teacherId) {
      return res.status(400).json({ message: "teacherId majburiy" });
    }

    const teacher = await Teacher.findOne({ _id: teacherId, school: req.user.schoolId })
      .populate("user", "name email")
      .populate("subject", "name")
      .lean();

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    let finalSubjectId = null;
    if (targetType === "class_teacher") {
      const cls = await ClassModel.findOne({
        _id: parent.student.class?._id || parent.student.class,
        school: req.user.schoolId,
      })
        .select("classTeacher")
        .lean();

      let isAllowedClassTeacher = Boolean(cls?.classTeacher && toId(cls.classTeacher) === toId(teacher._id));

      if (!isAllowedClassTeacher && !cls?.classTeacher) {
        const timetableTeacher = await Timetable.findOne({
          school: req.user.schoolId,
          class: parent.student.class?._id || parent.student.class,
          teacher: teacher._id,
        })
          .select("_id")
          .lean();

        isAllowedClassTeacher = Boolean(timetableTeacher);
      }

      if (!isAllowedClassTeacher) {
        return res.status(400).json({ message: "Bu o'qituvchi sizning sinfingizga biriktirilmagan" });
      }
      finalSubjectId = null;
    } else {
      finalSubjectId = subjectId || teacher.subject?._id || teacher.subject || null;
    }

    let thread = await ParentTeacherThread.findOne({
      school: req.user.schoolId,
      parent: req.user.id,
      student: parent.student._id,
      teacher: teacher._id,
      targetType,
      subject: finalSubjectId,
    });

    if (!thread) {
      thread = await ParentTeacherThread.create({
        school: req.user.schoolId,
        parent: req.user.id,
        student: parent.student._id,
        teacher: teacher._id,
        targetType,
        subject: finalSubjectId,
        lastMessageAt: new Date(),
        lastSenderRole: null,
      });
    }

    return res.status(201).json({
      id: thread._id,
      targetType: thread.targetType,
      teacherId: teacher._id,
      teacherName: teacher.user?.name || "O'qituvchi",
      teacherEmail: teacher.user?.email || "",
      subjectName: teacher.subject?.name || "",
      lastMessageAt: thread.lastMessageAt,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to create thread" });
  }
};

const listParentThreadMessages = async (req, res) => {
  try {
    await getParentContext(req.user);
    const { threadId } = req.params;

    const thread = await ParentTeacherThread.findOne({
      _id: threadId,
      school: req.user.schoolId,
      parent: req.user.id,
    });

    if (!thread) {
      return res.status(404).json({ message: "Thread topilmadi" });
    }

    const messages = await ParentTeacherMessage.find({ thread: thread._id })
      .populate("senderUser", "name email")
      .sort({ createdAt: 1 })
      .lean();

    return res.json(
      messages.map((m) => ({
        id: m._id,
        senderRole: m.senderRole,
        senderName: m.senderUser?.name || "",
        text: m.text,
        createdAt: m.createdAt,
      })),
    );
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list thread messages" });
  }
};

const sendParentThreadMessage = async (req, res) => {
  try {
    await getParentContext(req.user);
    const { threadId } = req.params;
    const text = (req.body?.text || "").toString().trim();

    if (!text) {
      return res.status(400).json({ message: "Xabar matni bo'sh bo'lmasligi kerak" });
    }

    const thread = await ParentTeacherThread.findOne({
      _id: threadId,
      school: req.user.schoolId,
      parent: req.user.id,
    });

    if (!thread) {
      return res.status(404).json({ message: "Thread topilmadi" });
    }

    const message = await ParentTeacherMessage.create({
      thread: thread._id,
      school: req.user.schoolId,
      senderUser: req.user.id,
      senderRole: "parent",
      text,
    });

    thread.lastMessageAt = new Date();
    thread.lastSenderRole = "parent";
    await thread.save();

    const populated = await ParentTeacherMessage.findById(message._id)
      .populate("senderUser", "name email")
      .lean();

    return res.status(201).json({
      id: populated._id,
      senderRole: populated.senderRole,
      senderName: populated.senderUser?.name || "",
      text: populated.text,
      createdAt: populated.createdAt,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to send message" });
  }
};

const listTeacherThreads = async (req, res) => {
  try {
    const teacher = await getTeacherContext(req.user);

    const threads = await ParentTeacherThread.find({
      school: req.user.schoolId,
      teacher: teacher._id,
    })
      .populate("subject", "name")
      .populate("parent", "name email")
      .populate({ path: "student", populate: [{ path: "user", select: "name email" }, { path: "class", select: "name" }] })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    return res.json(
      threads.map((t) => ({
        id: t._id,
        targetType: t.targetType,
        parentName: t.parent?.name || "Ota-ona",
        parentEmail: t.parent?.email || "",
        studentName: t.student?.user?.name || "",
        className: t.student?.class?.name || "",
        subjectName: t.subject?.name || teacher.subject?.name || "",
        lastMessageAt: t.lastMessageAt,
        lastSenderRole: t.lastSenderRole || null,
      })),
    );
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list teacher threads" });
  }
};

const listTeacherThreadMessages = async (req, res) => {
  try {
    const teacher = await getTeacherContext(req.user);
    const { threadId } = req.params;

    const thread = await ParentTeacherThread.findOne({
      _id: threadId,
      school: req.user.schoolId,
      teacher: teacher._id,
    });

    if (!thread) {
      return res.status(404).json({ message: "Thread topilmadi" });
    }

    const messages = await ParentTeacherMessage.find({ thread: thread._id })
      .populate("senderUser", "name email")
      .sort({ createdAt: 1 })
      .lean();

    return res.json(
      messages.map((m) => ({
        id: m._id,
        senderRole: m.senderRole,
        senderName: m.senderUser?.name || "",
        text: m.text,
        createdAt: m.createdAt,
      })),
    );
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list thread messages" });
  }
};

const sendTeacherThreadMessage = async (req, res) => {
  try {
    const teacher = await getTeacherContext(req.user);
    const { threadId } = req.params;
    const text = (req.body?.text || "").toString().trim();

    if (!text) {
      return res.status(400).json({ message: "Xabar matni bo'sh bo'lmasligi kerak" });
    }

    const thread = await ParentTeacherThread.findOne({
      _id: threadId,
      school: req.user.schoolId,
      teacher: teacher._id,
    });

    if (!thread) {
      return res.status(404).json({ message: "Thread topilmadi" });
    }

    const message = await ParentTeacherMessage.create({
      thread: thread._id,
      school: req.user.schoolId,
      senderUser: req.user.id,
      senderRole: "teacher",
      text,
    });

    thread.lastMessageAt = new Date();
    thread.lastSenderRole = "teacher";
    await thread.save();

    const populated = await ParentTeacherMessage.findById(message._id)
      .populate("senderUser", "name email")
      .lean();

    return res.status(201).json({
      id: populated._id,
      senderRole: populated.senderRole,
      senderName: populated.senderUser?.name || "",
      text: populated.text,
      createdAt: populated.createdAt,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to send message" });
  }
};

module.exports = {
  listParentChatTargets,
  listParentThreads,
  createOrGetParentThread,
  listParentThreadMessages,
  sendParentThreadMessage,
  listTeacherThreads,
  listTeacherThreadMessages,
  sendTeacherThreadMessage,
};
