const { listBranches, createBranch, updateBranch, deleteBranch } = require("./branch.service");

const list = async (req, res, next) => {
  try {
    const branches = await listBranches(req.tenantId);
    return res.json({ branches });
  } catch (err) {
    return next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, address } = req.body || {};
    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const branch = await createBranch(req.tenantId, { name, address });
    return res.status(201).json({ branch });
  } catch (err) {
    return next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const branch = await updateBranch(req.tenantId, req.params.id, req.body || {});
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    return res.json({ branch });
  } catch (err) {
    return next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const branch = await deleteBranch(req.tenantId, req.params.id);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
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
