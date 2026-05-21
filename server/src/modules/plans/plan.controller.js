const { listPlans, createPlan, deletePlanById } = require("./plan.service");

const list = async (req, res, next) => {
  try {
    const plans = await listPlans();
    return res.json({ plans });
  } catch (err) {
    return next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, maxStudents, maxBranches, features, price } = req.body || {};
    if (!name || maxStudents === undefined || maxBranches === undefined || price === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const plan = await createPlan({ name, maxStudents, maxBranches, features, price });
    return res.status(201).json({ plan });
  } catch (err) {
    return next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const plan = await deletePlanById(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  list,
  create,
  remove,
};
