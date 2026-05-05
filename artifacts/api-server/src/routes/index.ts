import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import walletRouter from "./wallet";
import transfersRouter from "./transfers";
import transactionsRouter from "./transactions";
import ledgerRouter from "./ledger";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";
import simulationRouter from "./simulation";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(walletRouter);
router.use(transfersRouter);
router.use(transactionsRouter);
router.use(ledgerRouter);
router.use(notificationsRouter);
router.use(adminRouter);
router.use(simulationRouter);

export default router;
