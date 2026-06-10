import { Router, type IRouter } from "express";
import healthRouter from "./health";
import notionRouter from "./notion";
import gcalRouter from "./gcal";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/notion", notionRouter);
router.use("/gcal", gcalRouter);

export default router;
