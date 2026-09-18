export const UserRolesEnum = {
  ADMIN: "admin",
  PROJECT_ADMIN: "project_admin",
  MEMBER: "member",
};

export const AvailableUserRole = Object.values(UserRolesEnum);

export const TaskStatusEnum = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
};

export const AvailableTaskStatues = Object.values(TaskStatusEnum);

export const TaskPriorityEnum = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

export const AvailableTaskPriorities = Object.values(TaskPriorityEnum);

export const SocketEventEnum = {
  TASK_CREATED: "taskCreated",
  TASK_UPDATED: "taskUpdated",
  TASK_DELETED: "taskDeleted",
  TASK_REORDERED: "taskReordered",
  SUBTASK_CREATED: "subtaskCreated",
  SUBTASK_UPDATED: "subtaskUpdated",
  SUBTASK_DELETED: "subtaskDeleted",
  NOTE_CREATED: "noteCreated",
  NOTE_UPDATED: "noteUpdated",
  NOTE_DELETED: "noteDeleted",
  MEMBER_ADDED: "memberAdded",
  MEMBER_REMOVED: "memberRemoved",
  JOIN_PROJECT: "joinProject",
};
