import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import mongoose from "mongoose";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import { Notification } from "../models/notification.models.js";
import {
  sendEmail,
  projectInvitationMailgenContent,
} from "../utils/mail.js";

const getProjects = asyncHandler(async (req, res) => {
  const projects = await ProjectMember.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "projects",
        localField: "project",
        foreignField: "_id",
        as: "project",
        pipeline: [
          {
            $lookup: {
              from: "projectmembers",
              localField: "_id",
              foreignField: "project",
              as: "projectmembers",
            },
          },
          {
            $addFields: {
              members: {
                $size: "$projectmembers",
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$project",
    },
    {
      $project: {
        project: {
          _id: 1,
          name: 1,
          description: 1,
          members: 1,
          createdAt: 1,
          createdBy: 1,
        },
        role: 1,
        _id: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        projects,
        "Projects fetched successfully",
      ),
    );
});

const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        project,
        "Project fetched successfully",
      ),
    );
});

const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const project = await Project.create({
    name,
    description,
    createdBy: new mongoose.Types.ObjectId(req.user._id),
  });

  await ProjectMember.create({
    user: new mongoose.Types.ObjectId(req.user._id),
    project: new mongoose.Types.ObjectId(project._id),
    role: UserRolesEnum.ADMIN,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        project,
        "Project created Successfully",
      ),
    );
});

const updateProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { projectId } = req.params;

  const project = await Project.findByIdAndUpdate(
    projectId,
    {
      name,
      description,
    },
    { new: true },
  );

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        project,
        "Project updated successfully",
      ),
    );
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findByIdAndDelete(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        project,
        "Project deleted successfully",
      ),
    );
});

const addMembersToProject = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const { projectId } = req.params;

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User does not exists");
  }

  await ProjectMember.findOneAndUpdate(
    {
      user: new mongoose.Types.ObjectId(user._id),
      project: new mongoose.Types.ObjectId(projectId),
    },
    {
      user: new mongoose.Types.ObjectId(user._id),
      project: new mongoose.Types.ObjectId(projectId),
      role: role,
    },
    {
      new: true,
      upsert: true,
    },
  );

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        {},
        "Project member added successfully",
      ),
    );
});

/*
 * Invite a user to a project.
 *
 * If the email already belongs to a Planora user:
 * - Add them to the project
 * - Create an in-app notification
 * - Send an invitation email
 *
 * If the email is not registered:
 * - Send an invitation email asking them to register
 */
const inviteMemberToProject = asyncHandler(async (req, res) => {
  const { email, role = UserRolesEnum.MEMBER } = req.body;
  const { projectId } = req.params;

  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    throw new ApiError(400, "Email is required");
  }

  if (!AvailableUserRole.includes(role)) {
    throw new ApiError(400, "Invalid role");
  }

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const inviter = await User.findById(req.user._id).select(
    "fullName username email",
  );

  const user = await User.findOne({
    email: normalizedEmail,
  });

  /*
   * If the invited person already has an account,
   * add them to the project immediately.
   */
  if (user) {
    const existingMember = await ProjectMember.findOne({
      user: user._id,
      project: project._id,
    });

    if (existingMember) {
      throw new ApiError(
        409,
        "This user is already a member of the project",
      );
    }

    await ProjectMember.create({
      user: user._id,
      project: project._id,
      role,
    });

    await Notification.create({
      recipient: user._id,
      type: "project_invite",
      title: "Project invitation",
      message: `${
        inviter?.fullName ||
        inviter?.username ||
        "A project admin"
      } invited you to join "${project.name}".`,
      project: project._id,
    });
  }

  /*
   * Build the project URL that will be included
   * in the invitation email.
   */
  const frontendUrl =
    process.env.FRONTEND_URL ||
    process.env.CORS_ORIGIN?.split(",")[0] ||
    "http://localhost:5173";

  const projectUrl = `${frontendUrl.replace(
    /\/$/,
    "",
  )}/projects/${project._id}`;

  /*
   * Send the invitation email.
   */
  await sendEmail({
    email: normalizedEmail,
    subject: `You're invited to ${project.name} on Planora`,
    mailgenContent: projectInvitationMailgenContent(
      user?.fullName ||
        user?.username ||
        normalizedEmail.split("@")[0],
      project.name,
      projectUrl,
      inviter?.fullName ||
        inviter?.username ||
        "A project admin",
      Boolean(user),
    ),
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        invited: true,
        existingUser: Boolean(user),
      },
      user
        ? "Invitation sent and project access granted"
        : "Invitation email sent. Ask the recipient to register with this email and resend the invitation.",
    ),
  );
});

const getProjectMembers = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const projectMembers = await ProjectMember.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
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
        user: {
          $arrayElemAt: ["$user", 0],
        },
      },
    },
    {
      $project: {
        project: 1,
        user: 1,
        role: 1,
        createdAt: 1,
        updatedAt: 1,
        _id: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        projectMembers,
        "Project members fetched",
      ),
    );
});

const updateMemberRole = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  const { newRole } = req.body;
  if (!AvailableUserRole.includes(newRole)) {
    throw new ApiError(400, "Invalid Role");
  }

  let projectMember = await ProjectMember.findOne({
    project: new mongoose.Types.ObjectId(projectId),
    user: new mongoose.Types.ObjectId(userId),
  });

  if (!projectMember) {
    throw new ApiError(400, "Project member not found");
  }

  projectMember = await ProjectMember.findByIdAndUpdate(
    projectMember._id,
    {
      role: newRole,
    },
    { new: true },
  );

  if (!projectMember) {
    throw new ApiError(400, "Project member not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        projectMember,
        "Project member role updated successfully",
      ),
    );
});

const deleteMember = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;

  let projectMember = await ProjectMember.findOne({
    project: new mongoose.Types.ObjectId(projectId),
    user: new mongoose.Types.ObjectId(userId),
  });

  if (!projectMember) {
    throw new ApiError(400, "Project member not found");
  }

  projectMember = await ProjectMember.findByIdAndDelete(
    projectMember._id,
  );

  if (!projectMember) {
    throw new ApiError(400, "Project member not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        projectMember,
        "Project member deleted successfully",
      ),
    );
});

export {
  addMembersToProject,
  inviteMemberToProject,
  createProject,
  deleteMember,
  getProjects,
  getProjectById,
  getProjectMembers,
  updateProject,
  deleteProject,
  updateMemberRole,
};