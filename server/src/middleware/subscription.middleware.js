const Subscription = require("../models/Subscription");
const School = require("../models/School");

const CHECK_ROLES = ["director", "school_admin"];

const checkSubscription = async (req, res, next) => {
  // Faqat direktor va maktab adminlari uchun tekshiramiz
  if (!req.user || !CHECK_ROLES.includes(req.user.role)) {
    return next();
  }

  try {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return next();
    }

    const [school, subscription] = await Promise.all([
      School.findById(schoolId).lean(),
      Subscription.findOne({ school: schoolId }).lean(),
    ]);

    // 1. Maktab mavjudligi va holatini tekshirish
    if (!school) {
      return res.status(404).json({ message: "Maktab topilmadi" });
    }

    if (school.status === "inactive") {
      return res.status(403).json({ message: "Maktab faol emas (Inactivated). Iltimos, Super Admin bilan bog'laning." });
    }

    const now = new Date();
    const gracePeriodDays = 3;
    const totalLockDays = 10; // 7 kun o'rniga 10 kun qildim, ko'proq imkoniyat uchun

    // 2. Obuna mavjudligini tekshirish
    if (!subscription) {
      // Yangi yaratilgan maktablarda obuna hali bo'lmasligi mumkin
      // Bu holda kamida GET so'rovlariga ruxsat beramiz, lekin ogohlantiramiz
      if (req.method !== "GET") {
        return res.status(402).json({ 
          message: "Obuna ma'lumotlari topilmadi. Iltimos, Super Admin bilan bog'laning.",
          noSubscription: true 
        });
      }
      return next();
    }

    const endAt = new Date(subscription.endAt);
    const graceDeadline = new Date(endAt.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);
    const lockDeadline = new Date(endAt.getTime() + totalLockDays * 24 * 60 * 60 * 1000);

    // 3. To'liq bloklash (lockDeadline dan o'tgan bo'lsa)
    if (now > lockDeadline) {
      return res.status(402).json({ 
        message: "Obuna muddati butunlay tugagan. Tizim bloklangan. Davom etish uchun to'lov qiling.",
        subscriptionExpired: true,
        isLocked: true
      });
    }

    // 4. Read-only rejimi (graceDeadline dan o'tgan bo'lsa faqat ko'rish mumkin)
    if (now > graceDeadline && req.method !== "GET") {
      return res.status(402).json({ 
        message: "Obuna muddati va 3 kunlik imtiyozli davr tugadi. Hozirda faqat ma'lumotlarni ko'rish mumkin. O'zgartirish kiritish uchun to'lov qiling.",
        subscriptionExpired: true,
        isReadOnly: true
      });
    }

    next();
  } catch (err) {
    console.error("Subscription middleware error:", err);
    next(err);
  }
};

module.exports = checkSubscription;
