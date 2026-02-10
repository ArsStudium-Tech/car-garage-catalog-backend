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

      const cars = await CarService.listCars(req.garage.id, "AVAILABLE");
      return res.json(cars);
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

