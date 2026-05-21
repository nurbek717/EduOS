const Branch = require("./branch.model");

const listBranches = async (tenantId) => Branch.find({ tenantId }).lean();

const createBranch = async (tenantId, payload) => Branch.create({ ...payload, tenantId });

const updateBranch = async (tenantId, id, payload) =>
  Branch.findOneAndUpdate({ _id: id, tenantId }, payload, { new: true }).lean();

const deleteBranch = async (tenantId, id) => Branch.findOneAndDelete({ _id: id, tenantId }).lean();

module.exports = {
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
};
