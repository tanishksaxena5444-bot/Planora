import mongoose from "mongoose";

import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Task } from "../models/task.models.js";
import { ProjectNote } from "../models/note.models.js";
import { User } from "../models/user.models.js";
import { ProjectActivity } from "../models/projectactivity.models.js";

import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

const ALLOWED_ACTIONS = new Set([
  "project_created",
  "project_updated",

  "task_created",
  "task_updated",
  "task_deleted",

  "subtask_created",
  "subtask_deleted",

  "note_created",
  "note_updated",
  "note_deleted",

  "member_added",
  "member_role_changed",
  "member_removed",
]);

async function ensureProjectMember(
  projectId,
  userId
) {
  const project =
    await Project.findById(projectId)
      .select("_id");

  if (!project) {
    throw new ApiError(
      404,
      "Project not found"
    );
  }

  const member =
    await ProjectMember.findOne({
      project:
        new mongoose.Types.ObjectId(
          projectId
        ),
      user:
        new mongoose.Types.ObjectId(userId),
    }).select("_id");

  if (!member) {
    throw new ApiError(
      403,
      "You are not a member of this project"
    );
  }
}

const createProjectActivity =
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const {
      action,
      message,
      metadata = {},
    } = req.body || {};

    if (!ALLOWED_ACTIONS.has(action)) {
      throw new ApiError(
        400,
        "Invalid activity action"
      );
    }

    const cleanMessage =
      String(message || "").trim();

    if (!cleanMessage) {
      throw new ApiError(
        400,
        "Activity message is required"
      );
    }

    await ensureProjectMember(
      projectId,
      req.user._id
    );

    const activity =
      await ProjectActivity.create({
        project:
          new mongoose.Types.ObjectId(
            projectId
          ),

        actor:
          new mongoose.Types.ObjectId(
            req.user._id
          ),

        action,

        message:
          cleanMessage.slice(0, 240),

        metadata,
      });

    const populated =
      await ProjectActivity.findById(
        activity._id
      ).populate(
        "actor",
        "_id username fullName email avatar"
      );

    return res.status(201).json(
      new ApiResponse(
        201,
        populated,
        "Project activity created successfully"
      )
    );
  });

const getProjectActivity =
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    await ensureProjectMember(
      projectId,
      req.user._id
    );

    let activities =
      await ProjectActivity.find({
        project:
          new mongoose.Types.ObjectId(
            projectId
          ),
      })
        .sort({
          createdAt: -1,
        })
        .limit(100)
        .populate(
          "actor",
          "_id username fullName email avatar"
        );

    /*
     * Existing projects may not have any
     * ProjectActivity documents yet.
     *
     * Create a temporary feed from existing
     * project records so the Activity tab
     * does not appear empty.
     */
    if (activities.length === 0) {
      const [
        project,
        tasks,
        notes,
        members,
      ] = await Promise.all([
        Project.findById(projectId)
          .select(
            "createdAt createdBy name"
          ),

        Task.find({
          project: projectId,
        })
          .select(
            "_id title createdAt assignedBy"
          )
          .sort({
            createdAt: -1,
          })
          .limit(25),

        ProjectNote.find({
          project: projectId,
        })
          .select(
            "_id createdAt createdBy"
          )
          .sort({
            createdAt: -1,
          })
          .limit(25),

        ProjectMember.find({
          project: projectId,
        })
          .select(
            "_id user createdAt"
          )
          .sort({
            createdAt: -1,
          })
          .limit(25),
      ]);

      const actorIds = new Set();

      if (project?.createdBy) {
        actorIds.add(
          String(project.createdBy)
        );
      }

      tasks.forEach((task) => {
        if (task.assignedBy) {
          actorIds.add(
            String(task.assignedBy)
          );
        }
      });

      notes.forEach((note) => {
        if (note.createdBy) {
          actorIds.add(
            String(note.createdBy)
          );
        }
      });

      members.forEach((member) => {
        if (member.user) {
          actorIds.add(
            String(member.user)
          );
        }
      });

      const users =
        await User.find({
          _id: {
            $in: [
              ...actorIds,
            ].map(
              (id) =>
                new mongoose.Types.ObjectId(
                  id
                )
            ),
          },
        }).select(
          "_id username fullName email avatar"
        );

      const userMap = new Map(
        users.map((user) => [
          String(user._id),
          user,
        ])
      );

      const snapshots = [];

      if (
        project?.createdAt &&
        project.createdBy
      ) {
        snapshots.push({
          _id: `snapshot-project-${project._id}`,
          project: project._id,

          actor: userMap.get(
            String(project.createdBy)
          ),

          action: "project_created",

          message: `Created project "${project.name}"`,

          createdAt:
            project.createdAt,
        });
      }

      tasks.forEach((task) => {
        snapshots.push({
          _id: `snapshot-task-${task._id}`,
          project: project._id,

          actor: userMap.get(
            String(task.assignedBy)
          ),

          action: "task_created",

          message: `Created task "${task.title}"`,

          createdAt:
            task.createdAt,
        });
      });

      notes.forEach((note) => {
        snapshots.push({
          _id: `snapshot-note-${note._id}`,
          project: project._id,

          actor: userMap.get(
            String(note.createdBy)
          ),

          action: "note_created",

          message:
            "Added a project note",

          createdAt:
            note.createdAt,
        });
      });

      members.forEach((member) => {
        if (
          String(member.user) ===
          String(project?.createdBy)
        ) {
          return;
        }

        const memberUser =
          userMap.get(
            String(member.user)
          );

        const memberLabel =
          memberUser?.fullName ||
          memberUser?.username ||
          memberUser?.email ||
          "a member";

        snapshots.push({
          _id: `snapshot-member-${member._id}`,
          project: project._id,

          actor: userMap.get(
            String(project?.createdBy)
          ),

          action: "member_added",

          message: `Added ${memberLabel} to the project`,

          createdAt:
            member.createdAt,
        });
      });

      activities = snapshots
        .filter(
          (item) => item.actor
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt) -
            new Date(a.createdAt)
        )
        .slice(0, 100);
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        activities,
        "Project activity fetched successfully"
      )
    );
  });

export {
  createProjectActivity,
  getProjectActivity,
};