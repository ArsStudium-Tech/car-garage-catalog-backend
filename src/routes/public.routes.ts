import { Router } from "express";
import { resolveGarage } from "../middlewares/resolveGarage";
import { PublicController } from "../controllers/public.controller";
import { BrandController } from "../controllers/brand.controller";

const router = Router();

router.get("/brands", BrandController.listBrands);

router.use(resolveGarage);

router.get("/garage-by-domain", PublicController.getGarage);
router.get("/cars", PublicController.listCars);
router.get("/cars/:id", PublicController.getCar);

export default router;

