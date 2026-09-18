import cron from "node-cron";
import { Task } from "../models/task.models.js";
import { TaskStatusEnum } from "./constants.js";
import { sendEmail, taskDueReminderMailgenContent } from "./mail.js";

/**
 * Finds tasks due within the next 24 hours (not yet done, and not already
 * reminded) and emails the assignee once. Runs every hour.
 */
const checkDueTasksAndSendReminders = async () => {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dueTasks = await Task.find({
    dueDate: { $gte: now, $lte: in24Hours },
    status: { $ne: TaskStatusEnum.DONE },
    reminderSentAt: null,
    assignedTo: { $ne: null },
  })
    .populate("assignedTo", "email username")
    .populate("project", "name");

  for (const task of dueTasks) {
    if (!task.assignedTo?.email) continue;

    await sendEmail({
      email: task.assignedTo.email,
      subject: `Reminder: "${task.title}" is due soon`,
      mailgenContent: taskDueReminderMailgenContent(
        task.assignedTo.username,
        task,
        task.project?.name || "your project",
      ),
    });

    task.reminderSentAt = new Date();
    await task.save();
  }

  if (dueTasks.length > 0) {
    console.log(`Sent ${dueTasks.length} due-date reminder email(s).`);
  }
};

export const startDueDateReminderCron = () => {
  // Runs at the top of every hour
  cron.schedule("0 * * * *", () => {
    checkDueTasksAndSendReminders().catch((err) => {
      console.error("Due date reminder cron failed:", err);
    });
  });
  console.log("Due-date reminder cron job scheduled (hourly).");
};
