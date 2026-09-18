import { body } from "express-validator";
import {
  AvailableUserRole,
  AvailableTaskStatues,
  AvailableTaskPriorities,
} from "../utils/constants.js";
const createProjectValidator = () => {
  return [
    body("name").notEmpty().withMessage("Name is required"),
    body("description").optional(),
  ];
};

const addMembertoProjectValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Email is invalid"),
    body("role")
      .notEmpty()
      .withMessage("Role is required")
      .isIn(AvailableUserRole)
      .withMessage("Role is invalid"),
  ];
};

const createTaskValidator = () => {
  return [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("description").optional().trim(),
    body("assignedTo").optional().isMongoId().withMessage("Invalid user id"),
    body("status")
      .optional()
      .isIn(AvailableTaskStatues)
      .withMessage("Invalid status"),
    body("priority")
      .optional()
      .isIn(AvailableTaskPriorities)
      .withMessage("Invalid priority"),
    body("tags").optional().isArray().withMessage("Tags must be an array"),
    body("dueDate")
      .optional()
      .isISO8601()
      .withMessage("Due date must be a valid date"),
  ];
};

const updateTaskValidator = () => {
  return [
    body("title").optional().trim().notEmpty().withMessage("Title cannot be empty"),
    body("description").optional().trim(),
    body("assignedTo").optional().isMongoId().withMessage("Invalid user id"),
    body("status")
      .optional()
      .isIn(AvailableTaskStatues)
      .withMessage("Invalid status"),
    body("priority")
      .optional()
      .isIn(AvailableTaskPriorities)
      .withMessage("Invalid priority"),
    body("tags").optional().isArray().withMessage("Tags must be an array"),
    body("dueDate")
      .optional()
      .isISO8601()
      .withMessage("Due date must be a valid date"),
  ];
};

const reorderTasksValidator = () => {
  return [
    body("tasks")
      .isArray({ min: 1 })
      .withMessage("tasks must be a non-empty array"),
    body("tasks.*.taskId").isMongoId().withMessage("Invalid task id"),
    body("tasks.*.status")
      .isIn(AvailableTaskStatues)
      .withMessage("Invalid status"),
    body("tasks.*.position")
      .isInt({ min: 0 })
      .withMessage("Invalid position"),
  ];
};

const createSubTaskValidator = () => {
  return [body("title").trim().notEmpty().withMessage("Title is required")];
};

const updateSubTaskValidator = () => {
  return [
    body("title").optional().trim().notEmpty().withMessage("Title cannot be empty"),
    body("isCompleted")
      .optional()
      .isBoolean()
      .withMessage("isCompleted must be a boolean"),
  ];
};

const createNoteValidator = () => {
  return [body("content").trim().notEmpty().withMessage("Content is required")];
};

export {
  createProjectValidator,
  addMembertoProjectValidator,
  createTaskValidator,
  updateTaskValidator,
  createSubTaskValidator,
  updateSubTaskValidator,
  createNoteValidator,
  reorderTasksValidator,
};
