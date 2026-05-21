const { listStudents, createStudent, updateStudent, deleteStudent } = require("./student.service");

const list = async (req, res, next) => {
  try {
    const students = await listStudents(req.tenantId);
    return res.json({ students });
  } catch (err) {
    return next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { fullname, branchId, phone, parentPhone } = req.body || {};
    if (!fullname || !branchId) {
      return res.status(400).json({ message: "fullname and branchId are required" });
    }

    const student = await createStudent(req.tenantId, { fullname, branchId, phone, parentPhone });
    return res.status(201).json({ student });
  } catch (err) {
    return next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const student = await updateStudent(req.tenantId, req.params.id, req.body || {});
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    return res.json({ student });
  } catch (err) {
    return next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const student = await deleteStudent(req.tenantId, req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
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
