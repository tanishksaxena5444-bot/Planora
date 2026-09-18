import { Notification } from "../models/notification.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import mongoose from "mongoose";

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({
    recipient: new mongoose.Types.ObjectId(req.user._id),
  })
    .populate("project", "name")
    .sort({ createdAt: -1 })
    .limit(30);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        notifications,
        "Notifications fetched successfully",
      ),
    );
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(notificationId),
      recipient: new mongoose.Types.ObjectId(req.user._id),
    },
    { read: true },
    { new: true },
  );

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, notification, "Notification marked as read"));
});

export { getNotifications, markNotificationRead };
