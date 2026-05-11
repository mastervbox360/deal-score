import { Router, type IRouter } from "express";
import healthRouter from "./health";
import generateSummaryRouter from "./generateSummary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(generateSummaryRouter);

export default router;
