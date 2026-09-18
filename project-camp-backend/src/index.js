import "dotenv/config";
import { createServer } from "http";
import app from "./app.js";
import connectDB from "./db/index.js";
import { initializeSocketIO } from "./socket/index.js";
import { startDueDateReminderCron } from "./utils/reminder.cron.js";

const port = process.env.PORT || 3000;
const httpServer = createServer(app);
const io = initializeSocketIO(httpServer);
// Make the io instance reachable from controllers via req.app.get("io")
app.set("io", io);

connectDB()
  .then(() => {
    httpServer.listen(port, () => {
      console.log(`Example app listening on port http://localhost:${port}`);
    });
    startDueDateReminderCron();
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
    process.exit(1);
  });
