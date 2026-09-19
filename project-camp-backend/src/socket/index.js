import { Server } from "socket.io";
import * as cookie from "cookie";
import admin from "firebase-admin";
import { User } from "../models/user.models.js";
import { SocketEventEnum } from "../utils/constants.js";

/**
 * Authenticates an incoming socket connection using the same Firebase ID token
 * that's used for regular HTTP requests (cookie or Authorization header).
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

    const token =
      cookies?.accessToken ||
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Unauthorized: No token provided"));
    }

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Find the corresponding local MongoDB user using Firebase UID
    const user = await User.findOne({
      firebaseUid: decodedToken.uid,
    }).select("-emailVerificationToken -emailVerificationExpiry");

    if (!user) {
      return next(new Error("Unauthorized: Invalid token"));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Unauthorized: " + error.message));
  }
};

/**
 * Initializes socket.io on top of the given HTTP server and returns the io instance.
 * Clients join a room per project (`project:<projectId>`) after connecting, and
 * controllers broadcast changes to that room so every open tab stays in sync.
 */
export const initializeSocketIO = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin:
        process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.user?.username, socket.id);

    socket.on(SocketEventEnum.JOIN_PROJECT, (projectId) => {
      socket.join(`project:${projectId}`);
    });

    socket.on("leaveProject", (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on("disconnect", () => {
      console.log(
        "Socket disconnected:",
        socket.user?.username,
        socket.id,
      );
    });
  });

  return io;
};

/**
 * Emits an event to every client currently in a project's room.
 * Call this from controllers via req.app.get("io") after a DB write succeeds.
 */
export const emitToProject = (io, projectId, event, payload) => {
  if (!io) return;

  io.to(`project:${projectId}`).emit(event, payload);
};