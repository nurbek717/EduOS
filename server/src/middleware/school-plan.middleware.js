const { resolveSchoolPlan, featureDeniedMessage } = require("../utils/schoolPlan");

const attachSchoolPlan = async (req, res, next) => {
  try {
    if (!req.user?.schoolId) {
      return next();
    }
    req.schoolPlan = await resolveSchoolPlan(req.user.schoolId);
    return next();
  } catch (err) {
    return next(err);
  }
};

const requirePlanFeature = (featureKey) => async (req, res, next) => {
  try {
    if (!req.user?.schoolId) {
      return res.status(403).json({ message: "Maktab biriktirilmagan" });
    }

    if (!req.schoolPlan) {
      req.schoolPlan = await resolveSchoolPlan(req.user.schoolId);
    }

    if (!req.schoolPlan.features?.[featureKey]) {
      return res.status(403).json({
        message: featureDeniedMessage(featureKey, req.schoolPlan.planName),
        featureRequired: featureKey,
        planName: req.schoolPlan.planName,
        features: req.schoolPlan.features,
      });
    }

    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  attachSchoolPlan,
  requirePlanFeature,
};
