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
  let host = req.headers.host;

  // Tenta usar origin ou referer se host for apenas "localhost" (sem subdomínio)
  // Para domínios normais como "garagem.teste.com", usa o host diretamente
  if (host && (host.startsWith("localhost") || host.split(":")[0] === "localhost")) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    
    if (origin) {
      try {
        const url = new URL(origin);
        const originHost = url.hostname;
        // Só usa origin se tiver subdomínio (ex: garagem1.localhost)
        if (originHost && originHost !== "localhost" && originHost.includes(".")) {
          host = originHost + (url.port ? `:${url.port}` : "");
        }
      } catch (e) {
        // Se origin não for uma URL válida, continua com host original
      }
    } else if (referer) {
      try {
        const url = new URL(referer);
        const refererHost = url.hostname;
        // Só usa referer se tiver subdomínio (ex: garagem1.localhost)
        if (refererHost && refererHost !== "localhost" && refererHost.includes(".")) {
          host = refererHost + (url.port ? `:${url.port}` : "");
        }
      } catch (e) {
        // Se referer não for uma URL válida, continua com host original
      }
    }
  }

  if (!host) {
    return res.status(400).json({ error: "Host header not found" });
  }

  // Remove www. e porta, mantendo o domínio completo
  // Exemplos:
  // - "garagem.teste.com:3000" -> "garagem.teste.com"
  // - "garagem1.localhost:3000" -> "garagem1.localhost"
  // - "www.garagem.teste.com" -> "garagem.teste.com"
  const domain = host.replace(/^www\./, "").split(":")[0].trim(); 

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

