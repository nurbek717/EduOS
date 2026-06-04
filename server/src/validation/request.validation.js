const {
  validateRequest,
  requireAtLeastOne,
  requireAllOrNone,
} = require("../middleware/validation.middleware");

const stringField = (overrides = {}) => ({
  type: "string",
  trim: true,
  ...overrides,
});

const nonEmptyStringField = (overrides = {}) => stringField({
  nonEmpty: true,
  ...overrides,
});

const nullableStringField = (overrides = {}) => stringField({
  nullable: true,
  emptyToNull: true,
  ...overrides,
});

const PHOTO_URL_MAX_LENGTH = 4_000_000;

const objectIdField = (overrides = {}) => ({
  type: "objectId",
  ...overrides,
});

const validators = {
  login: validateRequest({
    body: {
      email: { type: "email", required: true },
      password: { type: "password", required: true },
    },
  }),
  refresh: validateRequest({
    body: {
      refreshToken: nonEmptyStringField({ required: true, maxLength: 4096 }),
    },
  }),
  authProfileUpdate: validateRequest({
    body: {
      name: nonEmptyStringField({ minLength: 2, maxLength: 100 }),
      email: { type: "email" },
      phone: nullableStringField({ minLength: 7, maxLength: 50 }),
      photoUrl: nullableStringField({ maxLength: PHOTO_URL_MAX_LENGTH }),
      faceDescriptor: { type: "descriptor", nullable: true },
    },
    rules: [requireAtLeastOne(["name", "email", "phone", "photoUrl", "faceDescriptor"])],
  }),
  createSchool: validateRequest({
    body: {
      name: nonEmptyStringField({ required: true, minLength: 2, maxLength: 120 }),
      address: nullableStringField({ maxLength: 255 }),
      phone: nullableStringField({ maxLength: 50 }),
      directorName: nonEmptyStringField({ minLength: 2, maxLength: 100 }),
      directorEmail: { type: "email" },
      directorPassword: { type: "password" },
    },
    rules: [requireAllOrNone(["directorName", "directorEmail", "directorPassword"])],
  }),
  directorCreateClass: validateRequest({
    body: {
      name: nonEmptyStringField({ required: true, minLength: 1, maxLength: 100 }),
      branch: objectIdField({ nullable: true }),
    },
  }),
  directorUpdateClass: validateRequest({
    params: { id: objectIdField({ required: true }) },
    body: {
      name: nonEmptyStringField({ minLength: 1, maxLength: 100 }),
      classTeacherId: objectIdField({ nullable: true }),
      branch: objectIdField({ nullable: true }),
    },
    rules: [requireAtLeastOne(["name", "classTeacherId", "branch"])],
  }),
  directorCreateBranch: validateRequest({
    body: {
      name: nonEmptyStringField({ required: true, minLength: 1, maxLength: 120 }),
      address: nullableStringField({ maxLength: 255 }),
      managerUserId: objectIdField({ nullable: true }),
    },
  }),
  directorUpdateBranch: validateRequest({
    params: {
      id: objectIdField({ required: true }),
    },
    body: {
      name: nonEmptyStringField({ minLength: 1, maxLength: 120 }),
      address: nullableStringField({ maxLength: 255 }),
      managerUserId: objectIdField({ nullable: true }),
    },
    rules: [requireAtLeastOne(["name", "address", "managerUserId"])],
  }),
  directorCreateSubject: validateRequest({
    body: {
      name: nonEmptyStringField({ required: true, minLength: 1, maxLength: 100 }),
    },
  }),
  directorCreateTeacher: validateRequest({
    body: {
      name: nonEmptyStringField({ required: true, minLength: 2, maxLength: 100 }),
      email: { type: "email", required: true },
      password: { type: "password", required: true },
      subjectId: objectIdField({ required: true }),
    },
  }),
  directorUpdateTeacher: validateRequest({
    params: {
      id: objectIdField({ required: true }),
    },
    body: {
      name: nonEmptyStringField({ minLength: 2, maxLength: 100 }),
      email: { type: "email" },
      password: { type: "password" },
      subjectId: objectIdField(),
    },
    rules: [requireAtLeastOne(["name", "email", "password", "subjectId"])],
  }),
  idParam: validateRequest({
    params: {
      id: objectIdField({ required: true }),
    },
  }),
  directorCreateStudent: validateRequest({
    body: {
      name: nonEmptyStringField({ required: true, minLength: 2, maxLength: 100 }),
      email: { type: "email", required: true },
      phone: nonEmptyStringField({ minLength: 7, maxLength: 50 }),
      parentName: nonEmptyStringField({ minLength: 2, maxLength: 100 }),
      password: { type: "password", required: true },
      classId: objectIdField({ required: true }),
      studentCode: nullableStringField({ maxLength: 50 }),
      birthDate: { type: "dateString" },
      gender: { type: "enum", values: ["male", "female"] },
      nationality: nullableStringField({ maxLength: 100 }),
      birthCertSeries: nullableStringField({ maxLength: 20 }),
      birthCertNumber: nullableStringField({ maxLength: 50 }),
      status: { type: "enum", values: ["active", "inactive", "graduated"] },
      admissionOrderNumber: nullableStringField({ maxLength: 100 }),
      admissionOrderDate: { type: "dateString" },
      classAdmissionDate: { type: "dateString" },
      academicYear: nullableStringField({ maxLength: 50 }),
      educationLanguage: nullableStringField({ maxLength: 50 }),
      parentPassport: nullableStringField({ maxLength: 50 }),
      parentPhone: nullableStringField({ maxLength: 50 }),
      region: nullableStringField({ maxLength: 100 }),
      district: nullableStringField({ maxLength: 100 }),
      address: nullableStringField({ maxLength: 255 }),
    },
  }),
  directorUpdateStudent: validateRequest({
    params: {
      id: objectIdField({ required: true }),
    },
    body: {
      name: nonEmptyStringField({ minLength: 2, maxLength: 100 }),
      photoUrl: nullableStringField({ maxLength: PHOTO_URL_MAX_LENGTH }),
      faceDescriptor: { type: "descriptor", nullable: true },
    },
    rules: [requireAtLeastOne(["name", "photoUrl", "faceDescriptor"])],
  }),
  directorCreateParent: validateRequest({
    body: {
      name: nonEmptyStringField({ required: true, minLength: 2, maxLength: 100 }),
      email: { type: "email", required: true },
      phone: nonEmptyStringField({ required: true, minLength: 7, maxLength: 50 }),
      password: { type: "password", required: true },
      studentId: objectIdField({ required: true }),
    },
  }),
  directorCreateSchoolAdmin: validateRequest({
    body: {
      name: nonEmptyStringField({ required: true, minLength: 2, maxLength: 100 }),
      email: { type: "email", required: true },
      phone: nonEmptyStringField({ required: true, minLength: 7, maxLength: 50 }),
      password: { type: "password", required: true },
    },
  }),
  faceAttendance: validateRequest({
    body: {
      descriptor: { type: "descriptor", required: true },
      classId: objectIdField(),
    },
  }),
  directorCreateTimetable: validateRequest({
    body: {
      classId: objectIdField({ required: true }),
      subjectId: objectIdField({ required: true }),
      teacherId: objectIdField({ required: true }),
      dayOfWeek: { type: "integer", required: true, min: 0, max: 6 },
      startTime: { type: "time", required: true },
      endTime: { type: "time", required: true },
      room: nullableStringField({ maxLength: 100 }),
    },
  }),
  directorTimetableQuery: validateRequest({
    query: {
      classId: objectIdField({ required: true }),
    },
  }),
  directorClassInsightsQuery: validateRequest({
    query: {
      classId: objectIdField(),
      studentId: objectIdField(),
    },
  }),
  directorFinanceOverviewQuery: validateRequest({
    query: {
      year: { type: "integerString", min: 1970, max: 2100 },
    },
  }),
  directorCreateFinanceTransaction: validateRequest({
    body: {
      type: { type: "enum", values: ["income", "expense"], required: true },
      category: {
        type: "enum",
        values: ["donation", "grant", "other_income", "utilities", "maintenance", "supplies", "tax", "bonus", "other_expense"],
        required: true,
      },
      amount: { type: "number", required: true, min: 0.01 },
      occurredAt: { type: "dateString", required: true },
      description: nullableStringField({ maxLength: 255 }),
    },
  }),
  directorRecordStudentPayment: validateRequest({
    body: {
      studentId: objectIdField({ required: true }),
      amount: { type: "number", required: true, min: 0.01 },
      billingMonth: {
        type: "string",
        required: true,
        nonEmpty: true,
        pattern: /^\d{4}-(0[1-9]|1[0-2])$/,
        patternMessage: "billingMonth must be in YYYY-MM format",
      },
      occurredAt: { type: "dateString", required: true },
      description: nullableStringField({ maxLength: 255 }),
    },
  }),
  directorUpdateStudentMonthlyFee: validateRequest({
    params: {
      id: objectIdField({ required: true }),
    },
    body: {
      monthlyFee: { type: "number", required: true, min: 0 },
    },
  }),
  directorRecordSalaryPayment: validateRequest({
    body: {
      staffUserId: objectIdField({ required: true }),
      amount: { type: "number", required: true, min: 0.01 },
      billingMonth: {
        type: "string",
        required: true,
        nonEmpty: true,
        pattern: /^\d{4}-(0[1-9]|1[0-2])$/,
        patternMessage: "billingMonth must be in YYYY-MM format",
      },
      occurredAt: { type: "dateString", required: true },
      description: nullableStringField({ maxLength: 255 }),
    },
  }),
  directorUpdateStaffMonthlySalary: validateRequest({
    params: {
      id: objectIdField({ required: true }),
    },
    body: {
      monthlySalary: { type: "number", required: true, min: 0 },
    },
  }),
  teacherStudentsQuery: validateRequest({
    query: {
      classId: objectIdField(),
    },
  }),
  teacherCreateStudent: validateRequest({
    body: {
      name: nonEmptyStringField({ required: true, minLength: 2, maxLength: 100 }),
      email: { type: "email", required: true },
      password: { type: "password", required: true },
      classId: objectIdField({ required: true }),
      parentName: nullableStringField({ maxLength: 100 }),
      parentPhone: nullableStringField({ maxLength: 50 }),
      address: nullableStringField({ maxLength: 255 }),
    },
  }),
  teacherUpdateStudent: validateRequest({
    params: {
      id: objectIdField({ required: true }),
    },
    body: {
      name: nonEmptyStringField({ minLength: 2, maxLength: 100 }),
      email: { type: "email" },
      password: { type: "password" },
      classId: objectIdField(),
      parentName: nullableStringField({ maxLength: 100 }),
      parentPhone: nullableStringField({ maxLength: 50 }),
      address: nullableStringField({ maxLength: 255 }),
      photoUrl: nullableStringField({ maxLength: PHOTO_URL_MAX_LENGTH }),
      faceDescriptor: { type: "descriptor", nullable: true },
    },
    rules: [requireAtLeastOne(["name", "email", "password", "classId", "parentName", "parentPhone", "address", "photoUrl", "faceDescriptor"])],
  }),
  teacherCreateGrade: validateRequest({
    body: {
      studentId: objectIdField({ required: true }),
      grade: { type: "number", required: true, min: 1, max: 100 },
      subjectId: objectIdField(),
      date: { type: "dateString" },
    },
  }),
  teacherGradesQuery: validateRequest({
    query: {
      classId: objectIdField(),
    },
  }),
  teacherUpdateGrade: validateRequest({
    params: {
      id: objectIdField({ required: true }),
    },
    body: {
      grade: { type: "number", min: 1, max: 100 },
      date: { type: "dateString" },
    },
    rules: [requireAtLeastOne(["grade", "date"])],
  }),
  teacherAttendance: validateRequest({
    body: {
      classId: objectIdField({ required: true }),
      date: { type: "dateString", required: true },
      entries: {
        type: "array",
        required: true,
        minLength: 1,
        element: {
          type: "object",
          schema: {
            studentId: objectIdField({ required: true }),
            status: { type: "attendanceStatus", required: true },
          },
        },
      },
    },
  }),
  teacherHomework: validateRequest({
    body: {
      classId: objectIdField({ required: true }),
      subjectId: objectIdField(),
      description: nonEmptyStringField({ required: true, minLength: 3, maxLength: 2000 }),
      deadline: { type: "dateString", required: true },
    },
  }),
  teacherHomeworkQuery: validateRequest({
    query: {
      classId: objectIdField(),
    },
  }),
  teacherUpdateHomework: validateRequest({
    params: {
      id: objectIdField({ required: true }),
    },
    body: {
      classId: objectIdField(),
      subjectId: objectIdField(),
      description: nonEmptyStringField({ minLength: 3, maxLength: 2000 }),
      deadline: { type: "dateString" },
    },
    rules: [requireAtLeastOne(["classId", "subjectId", "description", "deadline"])],
  }),
  teacherGradeHomeworkSubmission: validateRequest({
    params: {
      id: objectIdField({ required: true }),
    },
    body: {
      gradedScore: { type: "number", required: true, min: 1, max: 100 },
      gradingComment: stringField({ trim: true, maxLength: 2000 }),
    },
  }),
  teacherTimetableQuery: validateRequest({
    query: {
      day: { type: "dayQuery" },
    },
  }),
  teacherAttendanceStatsQuery: validateRequest({
    query: {
      range: { type: "enum", values: ["1d", "1w", "1m"], nullable: true },
    },
  }),
  directorUsersQuery: validateRequest({
    query: {
      role: { type: "enum", values: ["teacher", "student", "parent", "school_admin"] },
      search: { type: "string", trim: true, maxLength: 100 },
    },
  }),
  directorManageUser: validateRequest({
    params: {
      id: objectIdField({ required: true }),
    },
    body: {
      name: nonEmptyStringField({ minLength: 2, maxLength: 100 }),
      email: { type: "email" },
      phone: nonEmptyStringField({ minLength: 7, maxLength: 50 }),
      password: { type: "password" },
      classId: objectIdField(),
      subjectId: objectIdField(),
      studentId: objectIdField(),
      academicYear: nonEmptyStringField({ maxLength: 50 }),
      educationLanguage: nonEmptyStringField({ maxLength: 50 }),
      admissionOrderDate: nonEmptyStringField({ maxLength: 30 }),
      classAcceptedDate: nonEmptyStringField({ maxLength: 30 }),
    },
    rules: [requireAtLeastOne(["name", "email", "phone", "password", "classId", "subjectId", "studentId", "academicYear", "educationLanguage", "admissionOrderDate", "classAcceptedDate"])],
  }),
  teacherCreateTimetable: validateRequest({
    body: {
      classId: objectIdField({ required: true }),
      dayOfWeek: { type: "integer", required: true, min: 0, max: 6 },
      startTime: { type: "time", required: true },
      endTime: { type: "time", required: true },
      room: nullableStringField({ maxLength: 100 }),
    },
  }),
  examManageQuery: validateRequest({
    query: {
      classId: objectIdField(),
    },
  }),
  createExam: validateRequest({
    body: {
      title: nonEmptyStringField({ required: true, minLength: 3, maxLength: 200 }),
      classId: objectIdField({ required: true }),
      subjectId: objectIdField(),
      duration: { type: "integer", required: true, min: 1, max: 600 },
      startTime: { type: "dateString", required: true },
      endTime: { type: "dateString", required: true },
      schoolId: objectIdField(),
      isPublished: { type: "boolean" },
    },
  }),
  examIdParam: validateRequest({
    params: {
      examId: objectIdField({ required: true }),
    },
  }),
  examAttemptIdParam: validateRequest({
    params: {
      attemptId: objectIdField({ required: true }),
    },
  }),
  examAttemptReviewParams: validateRequest({
    params: {
      examId: objectIdField({ required: true }),
      attemptId: objectIdField({ required: true }),
    },
  }),
  addExamQuestion: validateRequest({
    params: {
      examId: objectIdField({ required: true }),
    },
    body: {
      questionText: nonEmptyStringField({ required: true, minLength: 3, maxLength: 2000 }),
      type: { type: "enum", values: ["test", "text"], required: true },
      options: {
        type: "array",
        element: {
          type: "object",
          schema: {
            key: nonEmptyStringField({ required: true, maxLength: 50 }),
            text: nonEmptyStringField({ required: true, maxLength: 500 }),
          },
        },
      },
      correctAnswer: stringField({ maxLength: 500 }),
      points: { type: "number", required: true, min: 1, max: 100 },
      order: { type: "integer", min: 1 },
    },
  }),
  publishExam: validateRequest({
    params: {
      examId: objectIdField({ required: true }),
    },
    body: {
      isPublished: { type: "boolean", required: true },
    },
  }),
  submitExamAttempt: validateRequest({
    params: {
      attemptId: objectIdField({ required: true }),
    },
    body: {
      answers: {
        type: "array",
        required: true,
        element: {
          type: "object",
          schema: {
            questionId: objectIdField({ required: true }),
            answer: stringField({ maxLength: 5000 }),
            selectedOptionKey: stringField({ maxLength: 100 }),
            textAnswer: stringField({ maxLength: 5000 }),
          },
        },
      },
    },
  }),
  gradeExamAnswer: validateRequest({
    params: {
      answerId: objectIdField({ required: true }),
    },
    body: {
      awardedScore: { type: "number", required: true, min: 0, max: 100 },
      gradingComment: stringField({ maxLength: 2000 }),
    },
  }),
  studentProfileUpdate: validateRequest({
    body: {
      name: nonEmptyStringField({ required: true, minLength: 2, maxLength: 100 }),
    },
  }),
  studentSubmitHomework: validateRequest({
    params: {
      id: objectIdField({ required: true }),
    },
    body: {
      answerText: stringField({ trim: true, maxLength: 5000 }),
    },
  }),
  adminStatsQuery: validateRequest({
    query: {
      monthOffset: { type: "integerString", min: 0, max: 36 },
    },
  }),
  adminUsersQuery: validateRequest({
    query: {
      role: { type: "enum", values: ["director", "school_admin", "teacher", "student", "parent"] },
      search: { type: "string", trim: true, maxLength: 100 },
    },
  }),
  adminUpdateUser: validateRequest({
    params: {
      id: objectIdField({ required: true }),
    },
    body: {
      name: nonEmptyStringField({ minLength: 2, maxLength: 100 }),
      email: { type: "email" },
      password: { type: "password" },
    },
    rules: [requireAtLeastOne(["name", "email", "password"])],
  }),
  adminCreateSubscription: validateRequest({
    body: {
      schoolId: objectIdField({ required: true }),
      planId: objectIdField({ required: true }),
      days: { type: "integer", required: true, min: 1, max: 3650 },
      totalPrice: { type: "number", required: false, min: 0 },
    },
  }),
  adminSetSubscriptionEndAt: validateRequest({
    params: {
      id: objectIdField({ required: true }),
    },
    body: {
      endAt: { type: "dateString", required: true },
      planId: objectIdField({ required: false }),
    },
  }),
  createTicket: validateRequest({
    body: {
      title: nonEmptyStringField({ required: true, minLength: 5, maxLength: 200 }),
      description: nonEmptyStringField({ required: true, minLength: 10, maxLength: 2000 }),
      priority: { type: "enum", values: ["low", "medium", "high"] },
    },
  }),
  updateTicketStatus: validateRequest({
    params: {
      id: objectIdField({ required: true }),
    },
    body: {
      status: { type: "enum", values: ["open", "in_progress", "closed"], required: true },
    },
  }),
};

module.exports = validators;
