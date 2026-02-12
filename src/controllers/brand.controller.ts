import { Response } from "express";
import { BrandService } from "../services/brand.service";
import { GarageRequest } from "../middlewares/resolveGarage";

export class BrandController {
  static async listBrands(req: any, res: Response) {
    try {
      const activeOnly = req.query.active !== "false";
      const brands = await BrandService.listBrands(activeOnly);
      return res.json(brands);
    } catch (error) {
      console.error("Error listing brands:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getBrand(req: any, res: Response) {
    try {
      const { id } = req.params;
      const brand = await BrandService.getBrand(id);

      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }

      return res.json(brand);
    } catch (error) {
      console.error("Error getting brand:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async listBrandsWithCars(req: GarageRequest, res: Response) {
    try {
      if (!req.garage) {
        return res.status(404).json({ error: "Garage not found" });
      }

      const activeOnly = req.query.active !== "false";
      const brands = await BrandService.listBrandsWithCars(req.garage.id, activeOnly);
      return res.json(brands);
    } catch (error) {
      console.error("Error listing brands with cars:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

