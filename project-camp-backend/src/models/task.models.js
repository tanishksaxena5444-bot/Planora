import mongoose, { Schema } from "mongoose";
import {
  AvailableTaskStatues,
  TaskStatusEnum,
  AvailableTaskPriorities,
  TaskPriorityEnum,
} from "../utils/constants.js";

const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: AvailableTaskStatues,
      default: TaskStatusEnum.TODO,
    },
    priority: {
      type: String,
      enum: AvailableTaskPriorities,
      default: TaskPriorityEnum.MEDIUM,
    },
    tags: {
      type: [String],
      default: [],
    },
    dueDate: {
      type: Date,
    },
    reminderSentAt: {
      type: Date,
      default: null,
    },
    // Position of the task within its status column, used for Kanban drag-and-drop ordering.
    position: {
      type: Number,
      default: 0,
    },
    attachments: {
      type: [
        {
          url: String,
          mimetype: String,
          size: Number,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

taskSchema.index({ project: 1, status: 1, position: 1 });

export const Task = mongoose.model("Task", taskSchema);
