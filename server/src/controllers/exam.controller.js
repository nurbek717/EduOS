const Exam = require("../models/Exam");
const ExamQuestion = require("../models/ExamQuestion");
const ExamAttempt = require("../models/ExamAttempt");
const ExamAnswer = require("../models/ExamAnswer");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const ClassModel = require("../models/Class");
const Grade = require("../models/Grade");

const STAFF_MANAGE_ROLES = new Set(["teacher", "school_admin", "super_admin"]);
const RESULT_VIEW_ROLES = new Set(["teacher", "school_admin", "director", "super_admin"]);

const isSuperAdmin = (user) => user.role === "super_admin";

const normalizeAnswer = (value) =>
  (value || "")
    .toString()
    .trim()
    .toLowerCase();

const toDate = (value) => new Date(value);
const parseBooleanLike = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
};

const toObjectIdString = (value) => (value ? value.toString() : "");

const calcGradeFromAttempt = (attempt) => {
  if (!attempt || !attempt.maxScore || attempt.maxScore <= 0) return 0;
  const raw = Math.round((Number(attempt.totalScore || 0) / Number(attempt.maxScore)) * 100);
  if (raw < 0) return 0;
  if (raw > 100) return 100;
  return raw;
};

const getStudentForUser = async (user) => {
  const student = await Student.findOne({ user: user.id }).populate("class school");
  if (!student) {
    throw new Error("Student profile not found");
  }
  if (!user.schoolId || toObjectIdString(student.school._id) !== toObjectIdString(user.schoolId)) {
    throw new Error("Student not in this school");
  }
  return student;
};

const getTeacherForUser = async (user) => {
  const teacher = await Teacher.findOne({ user: user.id }).populate("school subject");
  if (!teacher) {
    throw new Error("Teacher profile not found");
  }
  if (!user.schoolId || toObjectIdString(teacher.school._id) !== toObjectIdString(user.schoolId)) {
    throw new Error("Teacher not in this school");
  }
  return teacher;
};

const canManageExam = async (user, exam) => {
  if (isSuperAdmin(user)) return true;
  if (!exam || !user.schoolId) return false;
  if (toObjectIdString(exam.school) !== toObjectIdString(user.schoolId)) return false;
  if (user.role === "school_admin") return true;
  if (user.role === "teacher") {
    if (toObjectIdString(exam.createdByUser) === toObjectIdString(user.id)) {
      return true;
    }

    const teacher = await Teacher.findOne({
      school: user.schoolId,
      user: user.id,
    })
      .select("_id")
      .lean();

    if (!teacher) return false;
    return toObjectIdString(exam.createdByTeacher) === toObjectIdString(teacher._id);
  }
  return false;
};

const canViewExamResults = async (user, exam) => {
  if (isSuperAdmin(user)) return true;
  if (!exam || !user.schoolId) return false;
  if (toObjectIdString(exam.school) !== toObjectIdString(user.schoolId)) return false;

  if (user.role === "director" || user.role === "school_admin") return true;
  if (user.role === "teacher") {
    if (toObjectIdString(exam.createdByUser) === toObjectIdString(user.id)) {
      return true;
    }

    const teacher = await Teacher.findOne({
      school: user.schoolId,
      user: user.id,
    })
      .select("_id")
      .lean();

    if (!teacher) return false;
    return toObjectIdString(exam.createdByTeacher) === toObjectIdString(teacher._id);
  }
  return false;
};

const resolveSubjectForExam = async (reqUser, subjectId) => {
  if (subjectId) return subjectId;
  if (reqUser.role === "teacher") {
    const teacher = await getTeacherForUser(reqUser);
    return teacher.subject?._id || teacher.subject;
  }
  return null;
};

const ensureClassAccess = async (user, classId, schoolIdForSuperAdmin) => {
  const schoolId = isSuperAdmin(user) ? schoolIdForSuperAdmin : user.schoolId;
  if (!schoolId) {
    throw new Error("schoolId is required");
  }
  const cls = await ClassModel.findOne({ _id: classId, school: schoolId }).lean();
  if (!cls) {
    throw new Error("Class not found in target school");
  }
  return { cls, schoolId };
};

const upsertGradeForAttempt = async ({ attempt, exam, evaluatorUserId, schoolId }) => {
  if (!exam.subject) {
    return null;
  }

  let teacherRef = exam.createdByTeacher || null;
  if (!teacherRef) {
    const evaluatorTeacher = await Teacher.findOne({
      school: schoolId,
      user: evaluatorUserId,
    })
      .select("_id")
      .lean();
    teacherRef = evaluatorTeacher?._id || null;
  }

  if (!teacherRef) {
    return null;
  }

  const score = calcGradeFromAttempt(attempt);

  return Grade.findOneAndUpdate(
    { examAttempt: attempt._id },
    {
      student: attempt.student,
      subject: exam.subject,
      teacher: teacherRef,
      school: schoolId,
      examAttempt: attempt._id,
      grade: score,
      date: new Date(),
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    },
  );
};

const mapQuestionForStudent = (q) => ({
  id: q._id,
  questionText: q.questionText,
  type: q.type,
  options: q.type === "test" ? q.options : [],
  points: q.points,
  order: q.order,
});

const createExam = async (req, res) => {
  try {
    if (!STAFF_MANAGE_ROLES.has(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const {
      title,
      classId,
      subjectId,
      duration,
      startTime,
      endTime,
      schoolId,
      isPublished,
    } = req.body;

    const resolvedSubject = await resolveSubjectForExam(req.user, subjectId);
    if (!resolvedSubject) {
      return res.status(400).json({ message: "subjectId is required for this user" });
    }

    const { cls, schoolId: targetSchoolId } = await ensureClassAccess(req.user, classId, schoolId);
    const start = toDate(startTime);
    const end = toDate(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: "startTime va endTime to'g'ri sana bo'lishi kerak" });
    }

    if (!(start < end)) {
      return res.status(400).json({ message: "Boshlanish vaqti tugash vaqtidan oldin bo'lishi kerak" });
    }

    let createdByTeacher = null;
    if (req.user.role === "teacher") {
      const teacher = await getTeacherForUser(req.user);
      createdByTeacher = teacher._id;
    } else if (req.user.role === "school_admin" && cls.classTeacher) {
      createdByTeacher = cls.classTeacher;
    }

    const exam = await Exam.create({
      title,
      school: targetSchoolId,
      class: classId,
      subject: resolvedSubject,
      durationMinutes: duration,
      startTime: start,
      endTime: end,
      isPublished: parseBooleanLike(isPublished, false),
      createdByUser: req.user.id,
      createdByTeacher,
      createdByRole: req.user.role,
    });

    return res.status(201).json(exam);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to create exam" });
  }
};

const addQuestion = async (req, res) => {
  try {
    const { examId } = req.params;
    const { questionText, type, options, correctAnswer, points, order } = req.body;

    const exam = await Exam.findById(examId).lean();
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (!(await canManageExam(req.user, exam))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (req.user.role === "teacher" && !exam.isPublished) {
      return res.status(400).json({ message: "Imtihonni avval maktab admini aktiv qilishi kerak" });
    }

    const hasAnyAttempt = await ExamAttempt.exists({ exam: exam._id });
    if (hasAnyAttempt) {
      return res.status(400).json({
        message: "Bu imtihonni o'quvchilar boshlab bo'lgan. Endi savol qo'shib bo'lmaydi.",
      });
    }

    if (type === "test") {
      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ message: "Test question requires at least 2 options" });
      }
      const keys = new Set(options.map((o) => normalizeAnswer(o.key)));
      if (!keys.has(normalizeAnswer(correctAnswer))) {
        return res.status(400).json({ message: "correctAnswer must match one option key" });
      }
    }

    const nextOrder =
      order || ((await ExamQuestion.countDocuments({ exam: examId })) + 1);

    const question = await ExamQuestion.create({
      exam: exam._id,
      school: exam.school,
      class: exam.class,
      questionText,
      type,
      options: type === "test" ? options : [],
      correctAnswer: type === "test" ? correctAnswer : null,
      points,
      order: nextOrder,
    });

    return res.status(201).json(question);
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to add question" });
  }
};

const listExamQuestions = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId).lean();
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (!(await canManageExam(req.user, exam))) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const questions = await ExamQuestion.find({ exam: exam._id })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return res.json(
      questions.map((q) => ({
        id: q._id,
        order: q.order,
        questionText: q.questionText,
        type: q.type,
        points: q.points,
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.type === "test" ? q.correctAnswer || null : null,
      })),
    );
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list exam questions" });
  }
};

const publishExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { isPublished } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (!(await canManageExam(req.user, exam))) {
      return res.status(403).json({ message: "Forbidden" });
    }

    exam.isPublished = parseBooleanLike(isPublished, exam.isPublished);
    await exam.save();

    return res.json({
      id: exam._id,
      isPublished: exam.isPublished,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update publish status" });
  }
};

const deleteExam = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId).lean();
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    if (!(await canManageExam(req.user, exam))) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (new Date() < new Date(exam.endTime)) {
      return res.status(400).json({
        message: "Imtihon hali tugamagan. O'chirish faqat imtihon yakunlangandan keyin mumkin.",
      });
    }

    const attempts = await ExamAttempt.find({ exam: exam._id, school: exam.school })
      .select("_id")
      .lean();
    const attemptIds = attempts.map((a) => a._id);

    const answerDeleteResult = await ExamAnswer.deleteMany({ exam: exam._id });
    const attemptDeleteResult = await ExamAttempt.deleteMany({ exam: exam._id, school: exam.school });
    const questionDeleteResult = await ExamQuestion.deleteMany({ exam: exam._id, school: exam.school });
    const gradeDeleteResult = attemptIds.length
      ? await Grade.deleteMany({ examAttempt: { $in: attemptIds } })
      : { deletedCount: 0 };
    const examDeleteResult = await Exam.deleteOne({ _id: exam._id });

    return res.json({
      success: true,
      deleted: {
        exams: Number(examDeleteResult.deletedCount || 0),
        questions: Number(questionDeleteResult.deletedCount || 0),
        attempts: Number(attemptDeleteResult.deletedCount || 0),
        answers: Number(answerDeleteResult.deletedCount || 0),
        grades: Number(gradeDeleteResult.deletedCount || 0),
      },
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to delete exam" });
  }
};

const listManagedExams = async (req, res) => {
  try {
    if (!RESULT_VIEW_ROLES.has(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { classId } = req.query;
    const query = {};

    if (!isSuperAdmin(req.user)) {
      query.school = req.user.schoolId;
    }
    if (classId) {
      query.class = classId;
    }
    if (req.user.role === "teacher") {
      const teacher = await getTeacherForUser(req.user);
      query.$or = [
        { createdByUser: req.user.id },
        { createdByTeacher: teacher._id },
      ];
    }

    const exams = await Exam.find(query)
      .populate("class", "name")
      .populate("subject", "name")
      .sort({ startTime: -1, createdAt: -1 })
      .lean();

    return res.json(
      exams.map((e) => ({
        id: e._id,
        title: e.title,
        classId: e.class?._id || null,
        className: e.class?.name || "",
        subjectName: e.subject?.name || "",
        duration: e.durationMinutes,
        startTime: e.startTime,
        endTime: e.endTime,
        isPublished: Boolean(e.isPublished),
        createdByRole: e.createdByRole,
      })),
    );
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list exams" });
  }
};

const listActiveExamsForStudent = async (req, res) => {
  try {
    const student = await getStudentForUser(req.user);
    const now = new Date();

    const exams = await Exam.find({
      school: student.school._id,
      class: student.class._id,
      isPublished: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
    })
      .sort({ startTime: 1 })
      .lean();

    const examIds = exams.map((e) => e._id);
    const attempts = await ExamAttempt.find({
      school: student.school._id,
      student: student._id,
      exam: { $in: examIds },
    })
      .select("exam status startedAt finishedAt")
      .lean();

    const attemptMap = new Map(attempts.map((a) => [toObjectIdString(a.exam), a]));

    return res.json(
      exams.map((e) => ({
        id: e._id,
        title: e.title,
        duration: e.durationMinutes,
        startTime: e.startTime,
        endTime: e.endTime,
        alreadyAttempted: attemptMap.has(toObjectIdString(e._id)),
        attemptStatus: attemptMap.get(toObjectIdString(e._id))?.status || null,
      })),
    );
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list active exams" });
  }
};

const listStudentExams = async (req, res) => {
  try {
    const student = await getStudentForUser(req.user);
    const now = new Date();

    const exams = await Exam.find({
      school: student.school._id,
      class: student.class._id,
      isPublished: true,
    })
      .sort({ startTime: 1, createdAt: -1 })
      .lean();

    const examIds = exams.map((e) => e._id);
    const attempts = await ExamAttempt.find({
      school: student.school._id,
      student: student._id,
      exam: { $in: examIds },
    })
      .select("_id exam status startedAt finishedAt expiresAt totalScore maxScore isFinalScore")
      .lean();

    const attemptMap = new Map(attempts.map((a) => [toObjectIdString(a.exam), a]));

    return res.json(
      exams.map((e) => {
        const attempt = attemptMap.get(toObjectIdString(e._id));
        const hasAttempt = Boolean(attempt);
        const inWindow = now >= new Date(e.startTime) && now <= new Date(e.endTime);
        const canResume =
          Boolean(attempt) &&
          attempt.status === "in_progress" &&
          new Date(now) <= new Date(attempt.expiresAt);

        let status = "upcoming";
        if (hasAttempt && canResume) {
          status = "in_progress";
        } else if (hasAttempt) {
          status = "completed";
        } else if (inWindow) {
          status = "active";
        } else if (now > new Date(e.endTime)) {
          status = "ended";
        }

        return {
          id: e._id,
          title: e.title,
          duration: e.durationMinutes,
          startTime: e.startTime,
          endTime: e.endTime,
          status,
          canStart: !hasAttempt && inWindow,
          canResume,
          alreadyAttempted: hasAttempt,
          attemptId: attempt?._id || null,
          attemptStatus: attempt?.status || null,
          totalScore: attempt?.totalScore ?? null,
          maxScore: attempt?.maxScore ?? null,
          isFinalScore: attempt?.isFinalScore ?? null,
        };
      }),
    );
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list student exams" });
  }
};

const startExamAttempt = async (req, res) => {
  try {
    const { examId } = req.params;
    const student = await getStudentForUser(req.user);
    const now = new Date();

    const exam = await Exam.findOne({
      _id: examId,
      school: student.school._id,
      class: student.class._id,
      isPublished: true,
    }).lean();

    if (!exam) {
      return res.status(404).json({ message: "Exam not found for your class" });
    }

    if (now < exam.startTime || now > exam.endTime) {
      return res.status(400).json({ message: "Exam is not active at this time" });
    }

    const existing = await ExamAttempt.findOne({
      exam: exam._id,
      student: student._id,
      school: student.school._id,
    }).lean();

    if (existing) {
      if (existing.status === "in_progress" && now <= existing.expiresAt) {
        const questions = await ExamQuestion.find({ exam: exam._id }).sort({ order: 1 }).lean();
        const answers = await ExamAnswer.find({ attempt: existing._id }).lean();
        return res.json({
          attemptId: existing._id,
          status: existing.status,
          startedAt: existing.startedAt,
          expiresAt: existing.expiresAt,
          remainingSeconds: Math.max(0, Math.floor((new Date(existing.expiresAt).getTime() - now.getTime()) / 1000)),
          serverTime: now,
          questions: questions.map(mapQuestionForStudent),
          answers: answers.map((a) => ({ questionId: a.question, answer: a.answer || "" })),
        });
      }

      return res.status(400).json({ message: "You can attempt this exam only once" });
    }

    const questions = await ExamQuestion.find({ exam: exam._id }).sort({ order: 1 }).lean();
    if (questions.length === 0) {
      return res.status(400).json({ message: "Exam has no questions" });
    }

    const maxScore = questions.reduce((sum, q) => sum + Number(q.points || 0), 0);
    const byDuration = new Date(now.getTime() + exam.durationMinutes * 60 * 1000);
    const expiresAt = byDuration < new Date(exam.endTime) ? byDuration : new Date(exam.endTime);

    const attempt = await ExamAttempt.create({
      exam: exam._id,
      student: student._id,
      school: student.school._id,
      class: student.class._id,
      startedAt: now,
      expiresAt,
      maxScore,
      status: "in_progress",
    });

    return res.status(201).json({
      attemptId: attempt._id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      remainingSeconds: Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)),
      serverTime: now,
      questions: questions.map(mapQuestionForStudent),
      answers: [],
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to start exam" });
  }
};

const getMyAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const student = await getStudentForUser(req.user);
    const now = new Date();

    const attempt = await ExamAttempt.findOne({
      _id: attemptId,
      student: student._id,
      school: student.school._id,
    })
      .populate("exam")
      .lean();

    if (!attempt || !attempt.exam) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    const questions = await ExamQuestion.find({ exam: attempt.exam._id }).sort({ order: 1 }).lean();
    const answers = await ExamAnswer.find({ attempt: attempt._id }).lean();

    return res.json({
      id: attempt._id,
      examId: attempt.exam._id,
      examTitle: attempt.exam.title,
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      finishedAt: attempt.finishedAt,
      autoScore: attempt.autoScore,
      manualScore: attempt.manualScore,
      totalScore: attempt.totalScore,
      maxScore: attempt.maxScore,
      isFinalScore: Boolean(attempt.isFinalScore),
      remainingSeconds:
        attempt.status === "in_progress"
          ? Math.max(0, Math.floor((new Date(attempt.expiresAt).getTime() - now.getTime()) / 1000))
          : 0,
      serverTime: now,
      questions: questions.map(mapQuestionForStudent),
      answers: answers.map((a) => ({
        questionId: a.question,
        answer: a.answer,
        isCorrect: a.isCorrect,
        awardedScore: a.awardedScore,
        gradingComment: a.gradingComment || "",
      })),
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load attempt" });
  }
};

const submitExamAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const payloadAnswers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const student = await getStudentForUser(req.user);
    const now = new Date();

    const attempt = await ExamAttempt.findOne({
      _id: attemptId,
      student: student._id,
      school: student.school._id,
    });

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.status !== "in_progress") {
      return res.status(400).json({ message: "Attempt is already finalized" });
    }

    if (now > new Date(attempt.expiresAt)) {
      attempt.status = "expired";
      attempt.finishedAt = now;
      await attempt.save();
      return res.status(400).json({ message: "Time is over. Attempt expired." });
    }

    const exam = await Exam.findById(attempt.exam).lean();
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const questions = await ExamQuestion.find({ exam: exam._id }).sort({ order: 1 }).lean();
    const answerMap = new Map();

    payloadAnswers.forEach((a) => {
      if (a && a.questionId) {
        const questionId = a.questionId.toString();
        const directAnswer = a.answer;
        const selectedOptionKey = a.selectedOptionKey;
        const textAnswer = a.textAnswer;
        const value =
          directAnswer !== undefined
            ? directAnswer
            : selectedOptionKey !== undefined
            ? selectedOptionKey
            : textAnswer !== undefined
            ? textAnswer
            : "";
        answerMap.set(questionId, value);
      }
    });

    let autoScore = 0;
    let pendingManualCount = 0;
    let submittedAnswersCount = 0;

    for (const q of questions) {
      const givenRaw = answerMap.has(toObjectIdString(q._id))
        ? answerMap.get(toObjectIdString(q._id))
        : "";
      const givenAnswer = (givenRaw || "").toString().trim();

      if (givenAnswer !== "") {
        submittedAnswersCount += 1;
      }

      pendingManualCount += 1;

      await ExamAnswer.findOneAndUpdate(
        {
          attempt: attempt._id,
          question: q._id,
        },
        {
          exam: exam._id,
          student: student._id,
          school: student.school._id,
          type: q.type,
          answer: givenAnswer,
          isCorrect: null,
          needsManualReview: true,
          awardedScore: null,
          maxScore: q.points,
          evaluationMode: "manual",
          evaluatedByUser: null,
          evaluatedAt: null,
          gradingComment: "",
        },
        {
          upsert: true,
          returnDocument: "after",
          setDefaultsOnInsert: true,
        },
      );
    }

    const finishedAt = new Date();
    const timeSpentSeconds = Math.max(
      0,
      Math.floor((finishedAt.getTime() - new Date(attempt.startedAt).getTime()) / 1000),
    );

    attempt.autoScore = autoScore;
    attempt.manualScore = 0;
    attempt.totalScore = autoScore;
    attempt.submittedAnswersCount = submittedAnswersCount;
    attempt.timeSpentSeconds = timeSpentSeconds;
    attempt.finishedAt = finishedAt;

    attempt.status = "awaiting_manual_review";
    attempt.isFinalScore = false;
    await attempt.save();

    return res.json({
      attemptId: attempt._id,
      status: attempt.status,
      autoScore: attempt.autoScore,
      totalScore: attempt.totalScore,
      maxScore: attempt.maxScore,
      pendingManualCount,
      isFinalScore: false,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to submit exam" });
  }
};

const gradeTextAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const { awardedScore, gradingComment } = req.body;

    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const answer = await ExamAnswer.findById(answerId)
      .populate("attempt")
      .populate("exam")
      .populate("question")
      .exec();

    if (!answer || !answer.attempt || !answer.exam || !answer.question) {
      return res.status(404).json({ message: "Answer not found" });
    }

    if (!(await canManageExam(req.user, answer.exam))) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!answer.needsManualReview) {
      return res.status(400).json({ message: "This answer is not awaiting manual review" });
    }

    if (answer.awardedScore !== null) {
      return res.status(403).json({ message: "Bu javob allaqachon baholangan. Qayta tahrirlash mumkin emas." });
    }

    const score = Number(awardedScore);
    const maxScore = Number(answer.maxScore || answer.question.points || 0);
    if (!Number.isFinite(score) || score < 0 || score > maxScore) {
      return res.status(400).json({
        message: `awardedScore must be between 0 and ${maxScore}`,
      });
    }

    answer.awardedScore = score;
    answer.isCorrect = score > 0;
    answer.evaluationMode = "manual";
    answer.evaluatedByUser = req.user.id;
    answer.evaluatedAt = new Date();
    answer.gradingComment = typeof gradingComment === "string" ? gradingComment.trim() : "";
    await answer.save();

    const attemptAnswers = await ExamAnswer.find({ attempt: answer.attempt._id }).lean();

    let autoScore = 0;
    let manualScore = 0;
    let pendingManual = 0;

    attemptAnswers.forEach((a) => {
      if (a.needsManualReview) {
        if (a.awardedScore === null || a.awardedScore === undefined) {
          pendingManual += 1;
        } else {
          manualScore += Number(a.awardedScore || 0);
        }
      } else {
        autoScore += Number(a.awardedScore || 0);
      }
    });

    answer.attempt.autoScore = autoScore;
    answer.attempt.manualScore = manualScore;
    answer.attempt.totalScore = autoScore + manualScore;

    if (pendingManual > 0) {
      answer.attempt.status = "awaiting_manual_review";
      answer.attempt.isFinalScore = false;
    } else {
      answer.attempt.status = "evaluated";
      answer.attempt.isFinalScore = true;
    }

    await answer.attempt.save();

    if (answer.attempt.isFinalScore) {
      await upsertGradeForAttempt({
        attempt: answer.attempt,
        exam: answer.exam,
        evaluatorUserId: req.user.id,
        schoolId: answer.attempt.school,
      });
    }

    return res.json({
      success: true,
      answerId: answer._id,
      awardedScore: answer.awardedScore,
      gradingComment: answer.gradingComment,
      attemptStatus: answer.attempt.status,
      totalScore: answer.attempt.totalScore,
      maxScore: answer.attempt.maxScore,
      isFinalScore: answer.attempt.isFinalScore,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to grade answer" });
  }
};

const listAttemptAnswersForReview = async (req, res) => {
  try {
    const { examId, attemptId } = req.params;

    if (!STAFF_MANAGE_ROLES.has(req.user.role) && !isSuperAdmin(req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const exam = await Exam.findById(examId).lean();
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (!(await canManageExam(req.user, exam))) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const attempt = await ExamAttempt.findOne({
      _id: attemptId,
      exam: exam._id,
      school: exam.school,
    })
      .populate({ path: "student", populate: { path: "user", select: "name email" } })
      .lean();

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    const questions = await ExamQuestion.find({ exam: exam._id })
      .select("_id questionText type points order options correctAnswer")
      .sort({ order: 1 })
      .lean();
    const answers = await ExamAnswer.find({ attempt: attempt._id })
      .select("_id question answer awardedScore maxScore needsManualReview gradingComment evaluatedAt")
      .lean();

    const answerMap = new Map(answers.map((a) => [toObjectIdString(a.question), a]));

    return res.json({
      attempt: {
        id: attempt._id,
        examId: exam._id,
        studentName: attempt.student?.user?.name || "",
        studentEmail: attempt.student?.user?.email || "",
        status: attempt.status,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
      },
      answers: questions.map((q) => {
        const a = answerMap.get(toObjectIdString(q._id));
        const correctOption =
          q.type === "test" && Array.isArray(q.options)
            ? q.options.find((opt) => normalizeAnswer(opt.key) === normalizeAnswer(q.correctAnswer))
            : null;

        return {
          answerId: a?._id || null,
          questionId: q._id,
          order: q.order,
          questionText: q.questionText,
          type: q.type,
          correctAnswerKey: q.type === "test" ? q.correctAnswer || null : null,
          correctAnswerText: q.type === "test" ? correctOption?.text || null : null,
          answerText: a?.answer || "",
          awardedScore: a?.awardedScore ?? null,
          maxScore: Number(a?.maxScore || q.points || 0),
          needsManualReview: Boolean(a?.needsManualReview ?? true),
          gradingComment: a?.gradingComment || "",
          evaluatedAt: a?.evaluatedAt || null,
        };
      }),
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list attempt answers" });
  }
};

const listExamResults = async (req, res) => {
  try {
    const { examId } = req.params;

    if (!RESULT_VIEW_ROLES.has(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const exam = await Exam.findById(examId)
      .populate("class", "name")
      .populate("subject", "name")
      .lean();

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (!(await canViewExamResults(req.user, exam))) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const attempts = await ExamAttempt.find({ exam: exam._id, school: exam.school })
      .populate({ path: "student", populate: { path: "user", select: "name email" } })
      .sort({ totalScore: -1, finishedAt: 1 })
      .lean();

    const attemptIds = attempts.map((a) => a._id);
    const answers = await ExamAnswer.find({ attempt: { $in: attemptIds } })
      .select("attempt question awardedScore maxScore needsManualReview isCorrect")
      .lean();

    const byAttempt = new Map();
    answers.forEach((a) => {
      const key = toObjectIdString(a.attempt);
      if (!byAttempt.has(key)) byAttempt.set(key, []);
      byAttempt.get(key).push(a);
    });

    return res.json({
      exam: {
        id: exam._id,
        title: exam.title,
        className: exam.class?.name || "",
        subjectName: exam.subject?.name || "",
        duration: exam.durationMinutes,
        startTime: exam.startTime,
        endTime: exam.endTime,
      },
      attempts: attempts.map((a) => {
        const rows = byAttempt.get(toObjectIdString(a._id)) || [];
        const checkedCount = rows.filter((r) => r.awardedScore !== null && r.awardedScore !== undefined).length;
        const manualPending = rows.filter((r) => r.needsManualReview && (r.awardedScore === null || r.awardedScore === undefined)).length;

        return {
          id: a._id,
          studentId: a.student?._id || null,
          studentName: a.student?.user?.name || "",
          studentEmail: a.student?.user?.email || "",
          startedAt: a.startedAt,
          finishedAt: a.finishedAt,
          status: a.status,
          score: a.totalScore,
          maxScore: a.maxScore,
          gradePercent: calcGradeFromAttempt(a),
          checkedAnswers: checkedCount,
          pendingManual: manualPending,
          isFinalScore: Boolean(a.isFinalScore),
        };
      }),
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to list exam results" });
  }
};

const getServerTime = async (_req, res) => {
  return res.json({ serverTime: new Date().toISOString() });
};

module.exports = {
  createExam,
  addQuestion,
  listExamQuestions,
  publishExam,
  deleteExam,
  listManagedExams,
  listStudentExams,
  listActiveExamsForStudent,
  startExamAttempt,
  getMyAttempt,
  submitExamAttempt,
  gradeTextAnswer,
  listAttemptAnswersForReview,
  listExamResults,
  getServerTime,
};
