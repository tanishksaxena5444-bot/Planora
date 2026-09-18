import { ActivitySession } from "../models/activity.model.js";

function getDateKey(date) {
  const value = new Date(date);

  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function getMonday(date) {
  const value = new Date(date);

  const day = value.getDay();

  const difference =
    day === 0 ? -6 : 1 - day;

  value.setDate(
    value.getDate() + difference
  );

  value.setHours(0, 0, 0, 0);

  return value;
}

function buildWeekDays() {
  const today = new Date();
  const monday = getMonday(today);

  const labels = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
  ];

  return labels.map((label, index) => {
    const date = new Date(monday);

    date.setDate(
      monday.getDate() + index
    );

    return {
      label,
      dateKey: getDateKey(date),
      seconds: 0,
    };
  });
}

export async function startActivity(
  req,
  res,
) {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const existing =
      await ActivitySession.findOne({
        user: userId,
        endedAt: null,
      }).sort({
        startedAt: -1,
      });

    if (existing) {
      return res.status(200).json({
        success: true,
        session: existing,
        message: "A work session is already active.",
      });
    }

    const session =
      await ActivitySession.create({
        user: userId,
        startedAt: new Date(),
      });

    return res.status(201).json({
      success: true,
      session,
    });
  } catch (error) {
    console.error(
      "Start activity error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to start work session.",
    });
  }
}

export async function stopActivity(
  req,
  res,
) {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { sessionId } = req.params;

    const session =
      await ActivitySession.findOne({
        _id: sessionId,
        user: userId,
        endedAt: null,
      });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Active work session not found.",
      });
    }

    const endedAt = new Date();

    const durationSeconds = Math.max(
      0,
      Math.floor(
        (endedAt.getTime() -
          new Date(
            session.startedAt,
          ).getTime()) /
          1000,
      ),
    );

    session.endedAt = endedAt;
    session.durationSeconds =
      durationSeconds;

    await session.save();

    const todayKey = getDateKey(
      new Date(),
    );

    const todaySessions =
      await ActivitySession.find({
        user: userId,
        startedAt: {
          $gte: new Date(
            `${todayKey}T00:00:00`,
          ),
        },
        endedAt: {
          $ne: null,
        },
      });

    const todaySeconds =
      todaySessions.reduce(
        (sum, item) =>
          sum +
          Number(
            item.durationSeconds || 0,
          ),
        0,
      );

    return res.status(200).json({
      success: true,
      session,
      todaySeconds,
    });
  } catch (error) {
    console.error(
      "Stop activity error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to stop work session.",
    });
  }
}

export async function getWeeklyActivity(
  req,
  res,
) {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const days = buildWeekDays();

    const monday = getMonday(
      new Date(),
    );

    const nextMonday = new Date(monday);

    nextMonday.setDate(
      monday.getDate() + 7,
    );

    const sessions =
      await ActivitySession.find({
        user: userId,
        startedAt: {
          $gte: monday,
          $lt: nextMonday,
        },
        endedAt: {
          $ne: null,
        },
      }).sort({
        startedAt: 1,
      });

    for (const session of sessions) {
      const key = getDateKey(
        session.startedAt,
      );

      const day = days.find(
        (item) => item.dateKey === key,
      );

      if (day) {
        day.seconds += Number(
          session.durationSeconds || 0,
        );
      }
    }

    const activeSession =
      await ActivitySession.findOne({
        user: userId,
        endedAt: null,
      }).sort({
        startedAt: -1,
      });

    const todayKey = getDateKey(
      new Date(),
    );

    const today = days.find(
      (day) =>
        day.dateKey === todayKey,
    );

    const todaySeconds =
      today?.seconds || 0;

    return res.status(200).json({
      success: true,
      days,
      todaySeconds,
      activeSession,
    });
  } catch (error) {
    console.error(
      "Weekly activity error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load weekly activity.",
    });
  }
}