import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import notionRouter from "./notion";
import gcalRouter from "./gcal";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use("/notion", requireAuth, notionRouter);
router.use("/gcal", requireAuth, gcalRouter);

export default router;
