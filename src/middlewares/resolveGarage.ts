import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma/client";

export interface GarageRequest extends Request {
  garage?: {
    id: string;
    name: string;
    domain: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    whatsapp?: string | null;
    active: boolean;
  };
}

export async function resolveGarage(
  req: GarageRequest,
  res: Response,
  next: NextFunction
) {
  const host = req.headers.host;

  if (!host) {
    return res.status(400).json({ error: "Host header not found" });
  }

  const domain = host.replace(/^www\./, "").split(":")[0]; 

  try {
    const garage = await prisma.garage.findUnique({
      where: { domain },
    });

    if (!garage || !garage.active) {
      return res.status(404).json({ error: "Garage not found" });
    }

    req.garage = garage;
    next();
  } catch (error) {
    console.error("Error resolving garage:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

