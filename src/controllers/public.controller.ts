import { Response } from "express";
import { GarageRequest } from "../middlewares/resolveGarage";
import { GarageService } from "../services/garage.service";
import { CarService } from "../services/car.service";

export class PublicController {
  static async getGarage(req: GarageRequest, res: Response) {
    try {
      if (!req.garage) {
        return res.status(404).json({ error: "Garage not found" });
      }

      return res.json(req.garage);
    } catch (error) {
      console.error("Error getting garage:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async listCars(req: GarageRequest, res: Response) {
    try {
      if (!req.garage) {
        return res.status(404).json({ error: "Garage not found" });
      }

      // Parse query parameters
      const {
        page,
        limit,
        search,
        brandId,
        year,
        orderBy,
      } = req.query;

      const filters: any = {
        status: "AVAILABLE", // Sempre filtra apenas disponíveis na rota pública
      };

      if (search && typeof search === "string") {
        filters.search = search;
      }

      if (brandId && typeof brandId === "string") {
        filters.brandId = brandId;
      }

      if (year && typeof year === "string") {
        const yearNum = parseInt(year);
        if (!isNaN(yearNum)) {
          filters.year = yearNum;
        }
      }

      const pagination: any = {};
      if (page && typeof page === "string") {
        const pageNum = parseInt(page);
        if (!isNaN(pageNum) && pageNum > 0) {
          pagination.page = pageNum;
        }
      }
      if (limit && typeof limit === "string") {
        const limitNum = parseInt(limit);
        if (!isNaN(limitNum) && limitNum > 0) {
          pagination.limit = limitNum;
        }
      }
      if (orderBy && typeof orderBy === "string") {
        const validOrderBy = ["price_asc", "price_desc", "newest", "oldest"];
        if (validOrderBy.includes(orderBy)) {
          pagination.orderBy = orderBy;
        }
      }

      const result = await CarService.listCars(req.garage.id, filters, pagination);
      return res.json(result);
    } catch (error) {
      console.error("Error listing cars:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getCar(req: GarageRequest, res: Response) {
    try {
      if (!req.garage) {
        return res.status(404).json({ error: "Garage not found" });
      }

      const { id } = req.params;
      const car = await CarService.getCar(id, req.garage.id);

      if (!car) {
        return res.status(404).json({ error: "Car not found" });
      }

      return res.json(car);
    } catch (error) {
      console.error("Error getting car:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

