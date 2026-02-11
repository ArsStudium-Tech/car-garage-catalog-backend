import { Router } from "express";
import { resolveGarage } from "../middlewares/resolveGarage";
import { authenticate } from "../middlewares/auth";
import { upload, uploadToR2 } from "../middlewares/upload";
import { optionalUpload } from "../middlewares/optionalUpload";
import { AdminController } from "../controllers/admin.controller";

const router = Router();

router.use(resolveGarage);
router.use(authenticate);

router.get("/cars", AdminController.listCars);
router.get("/cars/:id", AdminController.getCar);
// Usa type assertion para resolver conflito de tipos entre Express e Multer
router.post("/cars", upload.array("images", 10) as any, uploadToR2, AdminController.createCar);
// PUT: usa multer opcional - processa FormData se houver, senão processa JSON
router.put("/cars/:id", optionalUpload("images", 10), AdminController.updateCar);
router.delete("/cars/:id", AdminController.deleteCar);

router.get("/settings", AdminController.getSettings);
router.put("/settings", optionalUpload("logo", 1), AdminController.updateSettings);

router.get("/brands", AdminController.listBrands);

export default router;

