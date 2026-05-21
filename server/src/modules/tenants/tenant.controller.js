const { createTenant, getTenantById, listTenants, deleteTenantById } = require("./tenant.service");

const create = async (req, res, next) => {
  try {
    const { name, slug, owner, planId } = req.body || {};
    if (!name || !slug || !owner || !owner.email || !owner.password || !owner.fullname || !planId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await createTenant({ name, slug, owner, planId });
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const tenant = await getTenantById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    return res.json({ tenant });
  } catch (err) {
    return next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const tenants = await listTenants();
    return res.json({ tenants });
  } catch (err) {
    return next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const tenant = await deleteTenantById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  create,
  getById,
  list,
  remove,
};
