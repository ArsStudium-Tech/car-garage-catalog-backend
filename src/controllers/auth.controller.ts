import { Response } from "express";
import { GarageRequest } from "../middlewares/resolveGarage";
import { AuthService } from "../services/auth.service";

export class AuthController {
  static async login(req: GarageRequest, res: Response) {
    try {
      if (!req.garage) {
        return res.status(404).json({ error: "Garage not found" });
      }

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: "Email and password are required",
        });
      }

      const result = await AuthService.login(
        email,
        password,
        req.garage.id
      );

      return res.json(result);
    } catch (error: any) {
      console.error("Error in login:", error);
      return res.status(401).json({ error: error.message || "Invalid credentials" });
    }
  }
}

