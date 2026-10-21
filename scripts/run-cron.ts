/** Runs the scheduled jobs once (subscription reminders, expiry notices, saved-search alerts, cleanup).
 *  Usage: npm run cron:run   — or schedule GET /api/cron hourly in production. */
import { runAllJobs } from "../src/lib/cron";

runAllJobs()
  .then((r) => {
    console.log("Cron complete:", r);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
