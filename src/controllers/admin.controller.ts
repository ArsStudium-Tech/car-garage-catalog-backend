import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { CarService } from "../services/car.service";
import { GarageService } from "../services/garage.service";
import { BrandService } from "../services/brand.service";
import path from "path";

export class AdminController {
  static async listCars(req: AuthRequest, res: Response) {
    try {
      if (!req.garage) {
        return res.status(404).json({ error: "Garage not found" });
      }

      const { status } = req.query;
      const cars = await CarService.listCars(
        req.garage.id,
        status as any
      );
      return res.json(cars);
    } catch (error) {
      console.error("Error listing cars:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getCar(req: AuthRequest, res: Response) {
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

  static async createCar(req: AuthRequest, res: Response) {
    try {
      if (!req.garage) {
        return res.status(404).json({ error: "Garage not found" });
      }

      const { brandId, model, year, price, mileage, description } = req.body;

      if (!brandId || !model || !year || !price) {
        return res.status(400).json({
          error: "Missing required fields: brandId, model, year, price",
        });
      }

      // Processa as imagens enviadas
      const images: string[] = [];
      if (req.files) {
        let files: Express.Multer.File[] = [];
        
        if (Array.isArray(req.files)) {
          files = req.files;
        } else if (typeof req.files === 'object') {
          // Se for um objeto com múltiplos campos, pega todos os arquivos
          files = Object.values(req.files).flat();
        }
        
        images.push(
          ...files.map((file: Express.Multer.File) => {
            // Retorna o caminho relativo ou URL da imagem
            return `/uploads/${path.basename(file.path)}`;
          })
        );
      }

      const car = await CarService.createCar(req.garage.id, {
        brandId,
        model,
        year: parseInt(year),
        price: parseInt(price),
        mileage: mileage ? parseInt(mileage) : undefined,
        description,
        images,
      });

      return res.status(201).json(car);
    } catch (error) {
      console.error("Error creating car:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async updateCar(req: AuthRequest, res: Response) {
    try {
      if (!req.garage) {
        return res.status(404).json({ error: "Garage not found" });
      }

      const { id } = req.params;
      const { brandId, model, year, price, mileage, description, status, imagesToKeep } =
        req.body;

      const updateData: any = {};

      if (brandId) updateData.brandId = brandId;
      if (model) updateData.model = model;
      if (year) updateData.year = parseInt(year);
      if (price) updateData.price = parseInt(price);
      if (mileage !== undefined) updateData.mileage = mileage ? parseInt(mileage) : null;
      if (description !== undefined) updateData.description = description;
      if (status) updateData.status = status;

      // Processa imagens
      const currentCar = await CarService.getCar(id, req.garage.id);
      let finalImages: string[] = [];

      // Se imagesToKeep foi enviado, usa apenas essas imagens
      if (imagesToKeep) {
        try {
          const keepList = typeof imagesToKeep === 'string' ? JSON.parse(imagesToKeep) : imagesToKeep;
          finalImages = Array.isArray(keepList) ? keepList : [];
        } catch (e) {
          // Se não conseguir fazer parse, mantém todas as existentes
          finalImages = currentCar?.images || [];
        }
      } else {
        // Se não foi especificado, mantém todas as existentes
        finalImages = currentCar?.images || [];
      }

      // Adiciona novas imagens se houver
      if (req.files) {
        let files: Express.Multer.File[] = [];
        
        if (Array.isArray(req.files)) {
          files = req.files;
        } else if (typeof req.files === 'object') {
          files = Object.values(req.files).flat();
        }
        
        const newImages = files.map((file: Express.Multer.File) => {
          return `/uploads/${path.basename(file.path)}`;
        });
        
        finalImages = [...finalImages, ...newImages];
      }

      updateData.images = finalImages;

      const result = await CarService.updateCar(id, req.garage.id, updateData);

      if (!result || (typeof result === 'object' && 'count' in result && result.count === 0)) {
        return res.status(404).json({ error: "Car not found" });
      }

      // Se result já é o carro atualizado (com brand), retorna direto
      if (result && typeof result === 'object' && 'id' in result) {
        return res.json(result);
      }

      const updatedCar = await CarService.getCar(id, req.garage.id);
      return res.json(updatedCar);
    } catch (error) {
      console.error("Error updating car:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async deleteCar(req: AuthRequest, res: Response) {
    try {
      if (!req.garage) {
        return res.status(404).json({ error: "Garage not found" });
      }

      const { id } = req.params;
      const result = await CarService.deleteCar(id, req.garage.id);

      if (result.count === 0) {
        return res.status(404).json({ error: "Car not found" });
      }

      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting car:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async getSettings(req: AuthRequest, res: Response) {
    try {
      if (!req.garage) {
        return res.status(404).json({ error: "Garage not found" });
      }

      const settings = await GarageService.getSettings(req.garage.id);
      return res.json(settings);
    } catch (error) {
      console.error("Error getting settings:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async updateSettings(req: AuthRequest, res: Response) {
    try {
      if (!req.garage) {
        return res.status(404).json({ error: "Garage not found" });
      }

      const { name, logoUrl, primaryColor, secondaryColor, whatsapp, active } =
        req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
      if (secondaryColor !== undefined)
        updateData.secondaryColor = secondaryColor;
      if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
      if (active !== undefined) updateData.active = active;

      // Processa upload de logo se houver
      if (req.files) {
        let files: Express.Multer.File[] = [];
        
        if (Array.isArray(req.files)) {
          files = req.files;
        } else if (typeof req.files === 'object') {
          // Se for um objeto com múltiplos campos, pega todos os arquivos
          files = Object.values(req.files).flat();
        }
        
        if (files.length > 0) {
          const logoFile = files[0];
          updateData.logoUrl = `/uploads/${path.basename(logoFile.path)}`;
        }
      } else if (logoUrl !== undefined) {
        // Se não houver upload mas logoUrl foi enviado (pode ser para remover)
        updateData.logoUrl = logoUrl || null;
      }

      const settings = await GarageService.updateSettings(
        req.garage.id,
        updateData
      );
      return res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async listBrands(req: AuthRequest, res: Response) {
    try {
      const activeOnly = req.query.active !== "false";
      const brands = await BrandService.listBrands(activeOnly);
      return res.json(brands);
    } catch (error) {
      console.error("Error listing brands:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

