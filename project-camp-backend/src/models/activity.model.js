import mongoose from "mongoose";

const activitySessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    startedAt: {
      type: Date,
      required: true,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

activitySessionSchema.index({
  user: 1,
  startedAt: -1,
});

export const ActivitySession =
  mongoose.model(
    "ActivitySession",
    activitySessionSchema,
  );