import mongoose from "mongoose";
import { User } from "../models/user.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import admin from "../utils/firebase-admin.js";

// Verifies the Firebase ID token sent by the client (Authorization: Bearer <idToken>)
// and attaches the corresponding local User document to req.user.
// Note: exported as `verifyJWT` to keep every existing route file's import unchanged —
// it no longer verifies an app-issued JWT, it verifies a Firebase ID token.
export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }

  let decodedToken;
  try {
  decodedToken = await admin.auth().verifyIdToken(token);
} catch (error) {
  console.error("Firebase token verification failed:", {
    code: error?.code,
    message: error?.message,
  });

  throw new ApiError(401, "Invalid access token");
}

  const user = await User.findOne({ firebaseUid: decodedToken.uid }).select(
    "-emailVerificationToken -emailVerificationExpiry",
  );

  if (!user) {
    throw new ApiError(401, "Invalid access token");
  }

  req.user = user;
  next();
});

export const validateProjectPermission = (roles = []) => {
  return asyncHandler(async (req, res, next) => {
    const { projectId } = req.params;

    if (!projectId) {
      throw new ApiError(400, "project id is missing");
    }

    const project = await ProjectMember.findOne({
      project: new mongoose.Types.ObjectId(projectId),
      user: new mongoose.Types.ObjectId(req.user._id),
    });

    if (!project) {
      throw new ApiError(400, "project not found");
    }

    const givenRole = project?.role;

    req.user.role = givenRole;

    if (!roles.includes(givenRole)) {
      throw new ApiError(
        403,
        "You do not have permission to perform this action",
      );
    }

    next();
  });
};
