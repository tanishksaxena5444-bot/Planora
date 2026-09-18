import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { Task } from "../models/task.models.js";
import { Subtask } from "../models/subtask.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import mongoose from "mongoose";
import fs from "fs/promises";
import {
  AvailableUserRole,
  UserRolesEnum,
  SocketEventEnum,
} from "../utils/constants.js";
import { emitToProject } from "../socket/index.js";

const getTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const tasks = await Task.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "assignedTo",
        foreignField: "_id",
        as: "assignedTo",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "subtasks",
        localField: "_id",
        foreignField: "task",
        as: "subtasks",
      },
    },
    {
      $addFields: {
        assignedTo: {
          $arrayElemAt: ["$assignedTo", 0],
        },
      },
    },
    {
      $sort: {
        position: 1,
        createdAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, tasks, "Tasks fetched successfully"));
});

const createTask = asyncHandler(async (req, res) => {
  const { title, description, assignedTo, status, priority, tags, dueDate } =
    req.body;
  const { projectId } = req.params;

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const files = req.files || [];

  const attachments = files.map((file) => {
    return {
      url: `${process.env.SERVER_URL}/images/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size,
    };
  });

  const lastTask = await Task.findOne({
    project: new mongoose.Types.ObjectId(projectId),
    status: status || undefined,
  }).sort({ position: -1 });

  const position = lastTask ? lastTask.position + 1 : 0;

  const task = await Task.create({
    title,
    description,
    project: new mongoose.Types.ObjectId(projectId),
    assignedTo: assignedTo
      ? new mongoose.Types.ObjectId(assignedTo)
      : undefined,
    status,
    priority,
    tags,
    dueDate,
    position,
    assignedBy: new mongoose.Types.ObjectId(req.user._id),
    attachments,
  });

  emitToProject(
    req.app.get("io"),
    projectId,
    SocketEventEnum.TASK_CREATED,
    task,
  );

  return res
    .status(201)
    .json(new ApiResponse(201, task, "Task created successfully"));
});

const getTaskById = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await Task.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(taskId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "assignedTo",
        foreignField: "_id",
        as: "assignedTo",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "subtasks",
        localField: "_id",
        foreignField: "task",
        as: "subtasks",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              as: "createdBy",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              createdBy: {
                $arrayElemAt: ["$createdBy", 0],
              },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        assignedTo: {
          $arrayElemAt: ["$assignedTo", 0],
        },
      },
    },
  ]);

  if (!task || task.length === 0) {
    throw new ApiError(404, "Task not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, task[0], "Task fetched successfully"));
});

const updateTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { title, description, status, assignedTo, priority, tags, dueDate } =
    req.body;

  const task = await Task.findById(taskId);

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const files = req.files || [];

  const attachments = files.map((file) => {
    return {
      url: `${process.env.SERVER_URL}/images/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size,
    };
  });

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (status !== undefined) task.status = status;
  if (priority !== undefined) task.priority = priority;
  if (tags !== undefined) task.tags = tags;

  if (dueDate !== undefined) {
    task.dueDate = dueDate;
    task.reminderSentAt = null;
  }

  if (assignedTo !== undefined) {
    task.assignedTo = assignedTo
      ? new mongoose.Types.ObjectId(assignedTo)
      : undefined;
  }

  if (attachments.length > 0) {
    task.attachments = [...task.attachments, ...attachments];
  }

  await task.save();

  emitToProject(
    req.app.get("io"),
    task.project,
    SocketEventEnum.TASK_UPDATED,
    task,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task updated successfully"));
});

const deleteTaskAttachment = asyncHandler(async (req, res) => {
  const { taskId, attachmentId } = req.params;

  const task = await Task.findById(taskId);

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const attachment = task.attachments.id(attachmentId);

  if (!attachment) {
    throw new ApiError(404, "Attachment not found");
  }

  // Get the actual filename from the stored URL.
  // Example:
  // http://localhost:3000/images/1758123456789-index.js
  // -> 1758123456789-index.js
  const filename = attachment.url.split("/").pop();

  if (filename) {
    const filePath = `./public/images/${filename}`;

    try {
      await fs.unlink(filePath);
    } catch (error) {
      // If the physical file is already missing,
      // still remove the attachment from MongoDB.
      if (error.code !== "ENOENT") {
        console.error(
          "Failed to delete attachment file:",
          error
        );
      }
    }
  }

  // Remove attachment from the task
  task.attachments.pull(attachmentId);

  await task.save();

  emitToProject(
    req.app.get("io"),
    task.project,
    SocketEventEnum.TASK_UPDATED,
    task,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        task,
        "Attachment deleted successfully"
      )
    );
});

const reorderTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { tasks } = req.body;

  const bulkOps = tasks.map(({ taskId, status, position }) => ({
    updateOne: {
      filter: {
        _id: new mongoose.Types.ObjectId(taskId),
        project: new mongoose.Types.ObjectId(projectId),
      },
      update: { $set: { status, position } },
    },
  }));

  await Task.bulkWrite(bulkOps);

  const updatedTasks = await Task.find({
    project: new mongoose.Types.ObjectId(projectId),
  }).populate("assignedTo", "avatar username fullName");

  emitToProject(
    req.app.get("io"),
    projectId,
    SocketEventEnum.TASK_REORDERED,
    updatedTasks,
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      updatedTasks,
      "Tasks reordered successfully"
    )
  );
});

const deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await Task.findByIdAndDelete(taskId);

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  await Subtask.deleteMany({
    task: new mongoose.Types.ObjectId(taskId),
  });

  emitToProject(
    req.app.get("io"),
    task.project,
    SocketEventEnum.TASK_DELETED,
    { _id: task._id },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, task, "Task deleted successfully"));
});

const createSubTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { title } = req.body;

  const task = await Task.findById(taskId);

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const subtask = await Subtask.create({
    title,
    task: new mongoose.Types.ObjectId(taskId),
    createdBy: new mongoose.Types.ObjectId(req.user._id),
  });

  emitToProject(
    req.app.get("io"),
    task.project,
    SocketEventEnum.SUBTASK_CREATED,
    subtask,
  );

  return res
    .status(201)
    .json(new ApiResponse(201, subtask, "Subtask created successfully"));
});

const updateSubTask = asyncHandler(async (req, res) => {
  const { subTaskId } = req.params;
  const { title, isCompleted } = req.body;

  const subtask = await Subtask.findById(subTaskId);

  if (!subtask) {
    throw new ApiError(404, "Subtask not found");
  }

  if (title !== undefined) subtask.title = title;
  if (isCompleted !== undefined) subtask.isCompleted = isCompleted;

  await subtask.save();

  const parentTask = await Task.findById(subtask.task);

  emitToProject(
    req.app.get("io"),
    parentTask?.project,
    SocketEventEnum.SUBTASK_UPDATED,
    subtask,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, subtask, "Subtask updated successfully"));
});

const deleteSubTask = asyncHandler(async (req, res) => {
  const { subTaskId } = req.params;

  const subtask = await Subtask.findByIdAndDelete(subTaskId);

  if (!subtask) {
    throw new ApiError(404, "Subtask not found");
  }

  const parentTask = await Task.findById(subtask.task);

  emitToProject(
    req.app.get("io"),
    parentTask?.project,
    SocketEventEnum.SUBTASK_DELETED,
    { _id: subtask._id },
  );

  return res
    .status(200)
    .json(new ApiResponse(200, subtask, "Subtask deleted successfully"));
});

export {
  createSubTask,
  createTask,
  deleteTask,
  deleteSubTask,
  deleteTaskAttachment,
  getTaskById,
  getTasks,
  reorderTasks,
  updateSubTask,
  updateTask,
};