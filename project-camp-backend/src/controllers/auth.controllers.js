import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import admin from "../utils/firebase-admin.js";

// Verifies a Firebase ID token and finds-or-creates the
// matching local User record.
const firebaseAuth = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new ApiError(400, "Firebase idToken is required");
  }

  let decodedToken;

  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired Firebase token");
  }

  const {
    uid,
    email,
    name,
    picture,
    email_verified: emailVerified,
  } = decodedToken;

  if (!email) {
    throw new ApiError(
      400,
      "Firebase account has no email associated"
    );
  }

  // Email verification is required before allowing the user
  // to sign in to Planora.
  if (!emailVerified) {
    throw new ApiError(
      403,
      "Please verify your email before signing in"
    );
  }

  let user = await User.findOne({
    $or: [{ firebaseUid: uid }, { email }],
  });

  if (!user) {
    // Derive a reasonably unique, valid username from the email.
    const baseUsername = email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "");

    let username = baseUsername || `user${Date.now()}`;
    let suffix = 0;

    while (await User.findOne({ username })) {
      suffix += 1;
      username = `${baseUsername}${suffix}`;
    }

    user = await User.create({
      email,
      username,
      fullName: name || undefined,
      firebaseUid: uid,
      isEmailVerified: true,
      avatar: picture
        ? {
            url: picture,
            localPath: "",
          }
        : undefined,
    });
  } else {
    let changed = false;

    // Sync Firebase UID if the existing local user does not have it.
    if (!user.firebaseUid) {
      user.firebaseUid = uid;
      changed = true;
    }

    // Mark the local user as verified.
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      changed = true;
    }

    // Fill in missing username for older local users.
    if (!user.username) {
      const baseUsername = email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "");

      let username = baseUsername || `user${Date.now()}`;
      let suffix = 0;

      while (
        await User.findOne({
          username,
          _id: { $ne: user._id },
        })
      ) {
        suffix += 1;
        username = `${baseUsername}${suffix}`;
      }

      user.username = username;
      changed = true;
    }

    // Fill in missing full name from Firebase.
    if (!user.fullName && name) {
      user.fullName = name;
      changed = true;
    }

    // Fill in missing avatar from Firebase.
    if (!user.avatar?.url && picture) {
      user.avatar = {
        url: picture,
        localPath: "",
      };
      changed = true;
    }

    if (changed) {
      await user.save({
        validateBeforeSave: false,
      });
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user },
        "User authenticated successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // No server-side session to invalidate.
  // The client signs out of Firebase and removes its cached ID token.
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "User logged out"
      )
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        req.user,
        "Current user fetched successfully"
      )
    );
});

// Checks whether an email exists in Firebase Authentication.
export const checkEmail = async (req, res) => {
  try {
    const email = req.body?.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    try {
      await admin.auth().getUserByEmail(email);

      return res.status(200).json({
        exists: true,
      });
    } catch (error) {
      if (error?.code === "auth/user-not-found") {
        return res.status(200).json({
          exists: false,
        });
      }

      throw error;
    }
  } catch (error) {
    console.error("Check email error:", error);

    return res.status(500).json({
      message: "Unable to check email",
    });
  }
};

export {
  firebaseAuth,
  logoutUser,
  getCurrentUser,
};