const { listTeachers, createTeacher, updateTeacher, deleteTeacher } = require("./teacher.service");

const list = async (req, res, next) => {
  try {
    const teachers = await listTeachers(req.tenantId);
    return res.json({ teachers });
  } catch (err) {
    return next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { fullname, branchId, phone, subject } = req.body || {};
    if (!fullname || !branchId) {
      return res.status(400).json({ message: "fullname and branchId are required" });
    }

    const teacher = await createTeacher(req.tenantId, { fullname, branchId, phone, subject });
    return res.status(201).json({ teacher });
  } catch (err) {
    return next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const teacher = await updateTeacher(req.tenantId, req.params.id, req.body || {});
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    return res.json({ teacher });
  } catch (err) {
    return next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const teacher = await deleteTeacher(req.tenantId, req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  list,
  create,
  update,
  remove,
};
