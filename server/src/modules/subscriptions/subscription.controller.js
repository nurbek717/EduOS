const { getCurrentSubscription, createCheckout, activateSubscription } = require("./subscription.service");

const buildSubscriptionPayload = (body) => {
  const tenantId = body.tenantId || body.tenant_id;
  const planId = body.planId || body.plan_id;
  const startsAt = body.startsAt || body.starts_at || new Date();
  const expiresAt = body.expiresAt || body.expires_at;
  const periodDays = body.periodDays || body.period_days || null;

  if (!tenantId || !planId) {
    return null;
  }

  if (expiresAt) {
    return {
      tenantId,
      planId,
      startsAt: new Date(startsAt),
      expiresAt: new Date(expiresAt),
    };
  }

  if (periodDays) {
    const start = new Date(startsAt);
    const end = new Date(start);
    end.setDate(end.getDate() + Number(periodDays));
    return {
      tenantId,
      planId,
      startsAt: start,
      expiresAt: end,
    };
  }

  return null;
};

const current = async (req, res, next) => {
  try {
    const subscription = await getCurrentSubscription(req.tenantId);
    return res.json({ subscription });
  } catch (err) {
    return next(err);
  }
};

const checkout = async (req, res, next) => {
  try {
    const { planId } = req.body || {};
    if (!planId) {
      return res.status(400).json({ message: "planId is required" });
    }

    const checkoutResult = await createCheckout(req.tenantId, planId);
    return res.json(checkoutResult);
  } catch (err) {
    return next(err);
  }
};

const paymeWebhook = async (req, res, next) => {
  try {
    const secret = process.env.PAYME_WEBHOOK_SECRET;
    const provided = req.headers["x-payme-secret"];
    if (secret && provided !== secret) {
      return res.status(401).json({ message: "Invalid webhook secret" });
    }

    const payload = buildSubscriptionPayload(req.body || {});
    if (!payload) {
      return res.status(400).json({ message: "Missing webhook fields" });
    }

    const subscription = await activateSubscription(payload);

    return res.json({ ok: true, subscription });
  } catch (err) {
    return next(err);
  }
};

const clickWebhook = async (req, res, next) => {
  try {
    const secret = process.env.CLICK_WEBHOOK_SECRET;
    const provided = req.headers["x-click-secret"];
    if (secret && provided !== secret) {
      return res.status(401).json({ message: "Invalid webhook secret" });
    }

    const payload = buildSubscriptionPayload(req.body || {});
    if (!payload) {
      return res.status(400).json({ message: "Missing webhook fields" });
    }

    const subscription = await activateSubscription(payload);

    return res.json({ ok: true, subscription });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  current,
  checkout,
  paymeWebhook,
  clickWebhook,
};
