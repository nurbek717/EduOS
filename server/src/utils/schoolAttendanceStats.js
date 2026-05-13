const Attendance = require("../models/Attendance");

const TZ_UZ = "Asia/Tashkent";

/**
 * @param {import("mongoose").Types.ObjectId} schoolId
 * @param {"1d"|"1w"|"1m"} range
 * @returns {Promise<{ range: string, bucket: "hour"|"day", series: { bucket: string, presentLate: number, absent: number }[] }>}
 */
const getSchoolAttendanceStats = async (schoolId, range) => {
  if (!["1d", "1w", "1m"].includes(range)) {
    throw new Error("range must be 1d, 1w, or 1m");
  }

  const now = new Date();

  const presentLateExpr = {
    $sum: {
      $cond: [{ $in: ["$status", ["present", "late"]] }, 1, 0],
    },
  };
  const absentExpr = { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } };

  if (range === "1d") {
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    let raw;
    try {
      raw = await Attendance.aggregate([
        { $match: { school: schoolId, createdAt: { $gte: start, $lte: now } } },
        {
          $group: {
            _id: { $dateTrunc: { date: "$createdAt", unit: "hour", timezone: TZ_UZ } },
            presentLate: presentLateExpr,
            absent: absentExpr,
          },
        },
        { $sort: { _id: 1 } },
      ]);
    } catch (_e) {
      raw = await Attendance.aggregate([
        { $match: { school: schoolId, createdAt: { $gte: start, $lte: now } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%dT%H:00:00", date: "$createdAt", timezone: TZ_UZ },
            },
            presentLate: presentLateExpr,
            absent: absentExpr,
          },
        },
        { $sort: { _id: 1 } },
      ]);
    }

    const bucketMs = 60 * 60 * 1000;
    const firstBucket = Math.floor(start.getTime() / bucketMs) * bucketMs;
    const map = new Map(
      raw
        .map((r) => {
          const ts = r._id instanceof Date ? r._id.getTime() : Date.parse(String(r._id));
          if (Number.isNaN(ts)) return null;
          return [ts, { presentLate: r.presentLate, absent: r.absent }];
        })
        .filter(Boolean),
    );
    const series = [];
    for (let t = firstBucket; t <= now.getTime(); t += bucketMs) {
      const row = map.get(t) || { presentLate: 0, absent: 0 };
      series.push({
        bucket: new Date(t).toISOString(),
        presentLate: row.presentLate,
        absent: row.absent,
      });
    }
    return { range, bucket: "hour", series };
  }

  const days = range === "1w" ? 7 : 30;
  const matchStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  let raw;
  try {
    raw = await Attendance.aggregate([
      { $match: { school: schoolId, date: { $gte: matchStart } } },
      {
        $group: {
          _id: { $dateTrunc: { date: "$date", unit: "day", timezone: TZ_UZ } },
          presentLate: presentLateExpr,
          absent: absentExpr,
        },
      },
      { $sort: { _id: 1 } },
    ]);
  } catch (_e) {
    raw = await Attendance.aggregate([
      { $match: { school: schoolId, date: { $gte: matchStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: TZ_UZ } },
          presentLate: presentLateExpr,
          absent: absentExpr,
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  const map = new Map(
    raw.map((r) => {
      const key =
        r._id instanceof Date
          ? r._id.toLocaleDateString("en-CA", { timeZone: TZ_UZ })
          : String(r._id);
      return [key, { presentLate: r.presentLate, absent: r.absent }];
    }),
  );

  const series = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(now.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    const key = d.toLocaleDateString("en-CA", { timeZone: TZ_UZ });
    const row = map.get(key) || { presentLate: 0, absent: 0 };
    series.push({ bucket: `${key}T12:00:00.000Z`, presentLate: row.presentLate, absent: row.absent });
  }

  return { range, bucket: "day", series };
};

module.exports = { getSchoolAttendanceStats };
