const Teacher = require("./teacher.model");

const listTeachers = async (tenantId) => Teacher.find({ tenantId }).lean();

const createTeacher = async (tenantId, payload) => Teacher.create({ ...payload, tenantId });

const updateTeacher = async (tenantId, id, payload) =>
  Teacher.findOneAndUpdate({ _id: id, tenantId }, payload, { new: true }).lean();

const deleteTeacher = async (tenantId, id) => Teacher.findOneAndDelete({ _id: id, tenantId }).lean();

module.exports = {
  listTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
};
