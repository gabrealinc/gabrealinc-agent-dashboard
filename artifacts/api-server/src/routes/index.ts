import { Router, type IRouter } from "express";
import healthRouter from "./health";
import supabaseProxyRouter from "./supabase-proxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(supabaseProxyRouter);

export default router;
