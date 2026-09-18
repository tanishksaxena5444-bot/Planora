import mongoose from "mongoose";

import { ProjectMember } from "../models/projectmember.models.js";
import { Project } from "../models/project.models.js";
import { Task } from "../models/task.models.js";
import { ProjectNote } from "../models/note.models.js";

import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

const globalSearch = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          projects: [],
          tasks: [],
          members: [],
          notes: [],
        },
        "Search complete"
      )
    );
  }

  const userId = new mongoose.Types.ObjectId(req.user._id);

  const memberships = await ProjectMember.find({
    user: userId,
  }).select("project");

  const projectIds = memberships.map((item) => item.project);

  if (!projectIds.length) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          projects: [],
          tasks: [],
          members: [],
          notes: [],
        },
        "Search complete"
      )
    );
  }

  const regex = new RegExp(
    q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    "i"
  );

  const [projects, tasks, memberRows, notes] = await Promise.all([
    // PROJECTS
    Project.find({
      _id: { $in: projectIds },
      $or: [
        { name: regex },
        { description: regex },
      ],
    })
      .select("_id name description")
      .limit(8),

    // TASKS
    Task.find({
      project: { $in: projectIds },
      $or: [
        { title: regex },
        { description: regex },
      ],
    })
      .select("_id title status priority project")
      .populate("project", "name")
      .limit(10),

    // MEMBERS
    ProjectMember.find({
      project: { $in: projectIds },
    })
      .select("project user")
      .populate(
        "user",
        "_id username fullName email avatar"
      )
      .limit(50),

    // NOTES
    ProjectNote.find({
      project: { $in: projectIds },
      content: regex,
    })
      .select("_id content project createdAt createdBy")
      .populate("project", "name")
      .populate(
        "createdBy",
        "_id username fullName email avatar"
      )
      .limit(10),
  ]);

  const members = memberRows
    .map((row) => ({
      user: row.user,
      project: row.project,
    }))
    .filter((member) => Boolean(member.user))
    .filter(
      (member) =>
        regex.test(member.user.username || "") ||
        regex.test(member.user.fullName || "") ||
        regex.test(member.user.email || "")
    )
    .slice(0, 8);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        projects,
        tasks,
        members,
        notes,
      },
      "Search completed successfully"
    )
  );
});

export { globalSearch };