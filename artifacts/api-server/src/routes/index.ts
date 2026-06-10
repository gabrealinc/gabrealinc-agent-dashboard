import { Router, type IRouter } from "express";
import healthRouter from "./health";
import notionRouter from "./notion";
import gcalRouter from "./gcal";
import { dashboardAuth } from "../middleware/dashboardAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/notion", dashboardAuth, notionRouter);
router.use("/gcal", dashboardAuth, gcalRouter);

export default router;
