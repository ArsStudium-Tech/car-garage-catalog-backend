import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma/client";
import { GarageRequest } from "./resolveGarage";

export interface AuthRequest extends GarageRequest {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    garageId: string;
  };
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token not provided" });
    }

    const token = authHeader.substring(7);

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      userId: string;
      garageId: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        garageId: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Verifica se o usuário pertence à garagem do request
    if (req.garage && user.garageId !== req.garage.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error("Error in authentication:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

