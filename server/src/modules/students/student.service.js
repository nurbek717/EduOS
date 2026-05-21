const Student = require("./student.model");

const listStudents = async (tenantId) => Student.find({ tenantId }).lean();

const createStudent = async (tenantId, payload) => Student.create({ ...payload, tenantId });

const updateStudent = async (tenantId, id, payload) =>
  Student.findOneAndUpdate({ _id: id, tenantId }, payload, { new: true }).lean();

const deleteStudent = async (tenantId, id) => Student.findOneAndDelete({ _id: id, tenantId }).lean();

module.exports = {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
};
