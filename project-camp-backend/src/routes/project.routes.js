import { Router } from "express";

import {
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
} from "../controllers/project.controllers.js";

import { validate } from "../middlewares/validator.middleware.js";

import {
  createProjectValidator,
  addMembertoProjectValidator,
} from "../validators/index.js";

import {
  verifyJWT,
  validateProjectPermission,
} from "../middlewares/auth.middleware.js";

import {
  AvailableUserRole,
  UserRolesEnum,
} from "../utils/constants.js";

import taskRouter from "./task.routes.js";
import noteRouter from "./note.routes.js";

const router = Router();

router.use(verifyJWT);

router.use("/:projectId/tasks", taskRouter);

router.use("/:projectId/notes", noteRouter);

router
  .route("/")
  .get(getProjects)
  .post(
    createProjectValidator(),
    validate,
    createProject,
  );

router
  .route("/:projectId")
  .get(
    validateProjectPermission(AvailableUserRole),
    getProjectById,
  )
  .put(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    createProjectValidator(),
    validate,
    updateProject,
  )
  .delete(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    deleteProject,
  );

/*
 * Project invitation
 */
router
  .route("/:projectId/invitations")
  .post(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.PROJECT_ADMIN,
    ]),
    inviteMemberToProject,
  );

/*
 * Existing project members
 */
router
  .route("/:projectId/members")
  .get(getProjectMembers)
  .post(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    addMembertoProjectValidator(),
    validate,
    addMembersToProject,
  );

router
  .route("/:projectId/members/:userId")
  .put(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    updateMemberRole,
  )
  .delete(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    deleteMember,
  );

export default router;