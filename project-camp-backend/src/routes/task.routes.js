import { Router } from "express";

import {
  createTask,
  createSubTask,
  deleteTask,
  deleteSubTask,
  deleteTaskAttachment,
  getTaskById,
  getTasks,
  reorderTasks,
  updateSubTask,
  updateTask,
} from "../controllers/task.controllers.js";

import { validate } from "../middlewares/validator.middleware.js";

import {
  createTaskValidator,
  updateTaskValidator,
  createSubTaskValidator,
  updateSubTaskValidator,
  reorderTasksValidator,
} from "../validators/index.js";

import {
  verifyJWT,
  validateProjectPermission,
} from "../middlewares/auth.middleware.js";

import { upload } from "../middlewares/multer.middleware.js";

import {
  AvailableUserRole,
  UserRolesEnum,
} from "../utils/constants.js";

const router = Router({ mergeParams: true });

router.use(verifyJWT);

router
  .route("/")

  .get(
    validateProjectPermission(AvailableUserRole),
    getTasks
  )

  .post(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.PROJECT_ADMIN,
    ]),
    upload.array("attachments", 5),
    createTaskValidator(),
    validate,
    createTask,
  );

router
  .route("/reorder")
  .patch(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.PROJECT_ADMIN,
    ]),
    reorderTasksValidator(),
    validate,
    reorderTasks,
  );

/*
 * Delete a single task attachment
 *
 * DELETE /projects/:projectId/tasks/:taskId/attachments/:attachmentId
 */
router
  .route("/:taskId/attachments/:attachmentId")
  .delete(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.PROJECT_ADMIN,
    ]),
    deleteTaskAttachment,
  );

router
  .route("/:taskId")
  .get(
    validateProjectPermission(AvailableUserRole),
    getTaskById
  )

  .put(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.PROJECT_ADMIN,
    ]),
    upload.array("attachments", 5),
    updateTaskValidator(),
    validate,
    updateTask,
  )

  .delete(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.PROJECT_ADMIN,
    ]),
    deleteTask,
  );

router
  .route("/:taskId/subtasks")
  .post(
    validateProjectPermission(AvailableUserRole),
    createSubTaskValidator(),
    validate,
    createSubTask,
  );

router
  .route("/:taskId/subtasks/:subTaskId")
  .put(
    validateProjectPermission(AvailableUserRole),
    updateSubTaskValidator(),
    validate,
    updateSubTask,
  )

  .delete(
    validateProjectPermission(AvailableUserRole),
    deleteSubTask
  );

export default router;