import { Router } from "express";
import { resolveGarage } from "../middlewares/resolveGarage";
import { AuthController } from "../controllers/auth.controller";

const router = Router();

router.use(resolveGarage);

router.post("/login", AuthController.login);

export default router;

