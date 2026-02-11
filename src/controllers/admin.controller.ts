import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { CarService } from "../services/car.service";
import { GarageService } from "../services/garage.service";
import { BrandService } from "../services/brand.service";
import { StorageService } from "../services/storage.service";

export class AdminController {
  static async listCars(req: AuthRequest, res: Response) {
    try {
      if (!req.garage) {
        return res.status(404).json({ error: "Garage not found" });
      }

      const { status } = req.query;
      const filters: any = {};
      if (status) {
        filters.status = status;
      }
      
      // Para admin, retornar todos os carros sem paginação
      const result = await CarService.listCars(
        req.garage.id,
        filters,
        { limit: 10000 } // Limite alto para pegar todos
      );
      
      // Retornar apenas o array de carros para manter compatibilidade
      return res.json(result.cars);
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

      const { brandId, model, year, price, mileage, description, fuel, color, transmission, licensePlate, financeable, options } = req.body;

      if (!brandId || !model || !year || !price) {
        return res.status(400).json({
          error: "Missing required fields: brandId, model, year, price",
        });
      }

      // Processa options se for string JSON
      let optionsObj: Record<string, boolean> | undefined = undefined;
      if (options) {
        try {
          optionsObj = typeof options === 'string' ? JSON.parse(options) : options;
        } catch (e) {
          console.error("Error parsing options:", e);
        }
      }

      // Cria o carro primeiro (sem imagens ainda)
      const car = await CarService.createCar(req.garage.id, {
        brandId,
        model,
        year: parseInt(year),
        price: parseInt(price),
        mileage: mileage ? parseInt(mileage) : undefined,
        description,
        images: [], // Será atualizado após upload
        fuel: fuel || undefined,
        color: color || undefined,
        transmission: transmission || undefined,
        licensePlate: licensePlate || undefined,
        financeable: financeable === 'true' || financeable === true,
        options: optionsObj,
      });

      // Agora faz upload das imagens com o carId
      const images: string[] = [];
      const uploadedFiles = (req as any).uploadedFiles || [];
      
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          if (!file.buffer) {
            continue;
          }

          const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = require('path').extname(file.originalname);
          const filename = `car-${uniqueSuffix}${ext}`;

          // Faz upload para R2 com organização: garageId/carId/filename
          const url = await StorageService.uploadImage(
            file.buffer,
            filename,
            file.mimetype,
            req.garage.id,
            car.id
          );
          images.push(url);
        }

        // Atualiza o carro com as URLs das imagens
        await CarService.updateCar(car.id, req.garage.id, { images });
      }

      // Busca o carro atualizado para retornar
      const updatedCar = await CarService.getCar(car.id, req.garage.id);
      return res.status(201).json(updatedCar || car);
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
      const { brandId, model, year, price, mileage, description, status, imagesToKeep, fuel, color, transmission, licensePlate, financeable, options } =
        req.body;

      // Log para debug
      console.log("Update car request:", {
        carId: id,
        hasImagesToKeep: imagesToKeep !== undefined,
        imagesToKeepType: typeof imagesToKeep,
        imagesToKeepValue: imagesToKeep,
        hasFiles: !!req.files,
        filesCount: Array.isArray(req.files) ? req.files.length : (req.files ? Object.keys(req.files).length : 0),
      });

      const updateData: any = {};

      if (brandId) updateData.brandId = brandId;
      if (model) updateData.model = model;
      if (year) updateData.year = parseInt(year);
      if (price) updateData.price = parseInt(price);
      if (mileage !== undefined) updateData.mileage = mileage ? parseInt(mileage) : null;
      if (description !== undefined) updateData.description = description;
      if (status) updateData.status = status;
      if (fuel !== undefined) updateData.fuel = fuel || null;
      if (color !== undefined) updateData.color = color || null;
      if (transmission !== undefined) updateData.transmission = transmission || null;
      if (licensePlate !== undefined) updateData.licensePlate = licensePlate || null;
      if (financeable !== undefined) updateData.financeable = financeable === 'true' || financeable === true;
      
      // Processa options se for string JSON
      if (options !== undefined) {
        try {
          updateData.options = typeof options === 'string' ? (options ? JSON.parse(options) : null) : options;
        } catch (e) {
          console.error("Error parsing options:", e);
        }
      }

      // Processa imagens
      const currentCar = await CarService.getCar(id, req.garage.id);
      if (!currentCar) {
        return res.status(404).json({ error: "Car not found" });
      }

      const currentImages = currentCar.images || [];
      let finalImages: string[] = [];

      // Se imagesToKeep foi enviado, usa apenas essas imagens
      if (imagesToKeep !== undefined && imagesToKeep !== null && imagesToKeep !== '') {
        try {
          const keepList = typeof imagesToKeep === 'string' ? JSON.parse(imagesToKeep) : imagesToKeep;
          finalImages = Array.isArray(keepList) ? keepList : [];
        } catch (e) {
          console.error("Error parsing imagesToKeep:", e);
          // Se não conseguir fazer parse, mantém todas as existentes
          finalImages = currentImages;
        }
      } else {
        // Se não foi especificado, mantém todas as existentes
        finalImages = currentImages;
      }

      // Normaliza URLs para comparação (remove espaços, normaliza trailing slashes)
      const normalizeUrl = (url: string) => {
        if (!url) return '';
        return url.trim().replace(/\/$/, ''); // Remove trailing slash
      };

      // Cria um Set com URLs normalizadas das imagens a manter para comparação rápida
      const finalImagesSet = new Set(finalImages.map(normalizeUrl));

      // Identifica imagens que foram removidas (estavam no carro mas não estão em finalImages)
      const imagesToDelete = currentImages.filter(
        (img) => {
          const normalized = normalizeUrl(img);
          return normalized && !finalImagesSet.has(normalized);
        }
      );

      // Log para debug
      console.log("Image update debug:", {
        currentImagesCount: currentImages.length,
        finalImagesCount: finalImages.length,
        imagesToDeleteCount: imagesToDelete.length,
        imagesToDelete: imagesToDelete,
      });

      // Deleta imagens removidas do R2
      if (imagesToDelete.length > 0) {
        try {
          console.log(`Deleting ${imagesToDelete.length} images from R2`);
          await StorageService.deleteImages(imagesToDelete);
          console.log("Successfully deleted images from R2");
        } catch (error) {
          console.error("Error deleting images from R2:", error);
          // Continua mesmo se falhar a deleção
        }
      }

      // Adiciona novas imagens se houver (URLs do R2 vêm do middleware uploadToR2)
      const uploadedUrls = (req as any).uploadedUrls || [];
      if (uploadedUrls.length > 0) {
        finalImages = [...finalImages, ...uploadedUrls];
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
      
      // Busca o carro antes de deletar para pegar as imagens
      const car = await CarService.getCar(id, req.garage.id);
      
      if (!car) {
        return res.status(404).json({ error: "Car not found" });
      }

      // Deleta todas as imagens do R2
      if (car.images && car.images.length > 0) {
        try {
          await StorageService.deleteImages(car.images);
        } catch (error) {
          console.error("Error deleting images from R2:", error);
          // Continua mesmo se falhar a deleção
        }
      }

      // Deleta o carro do banco
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

      // Busca settings atuais para pegar logo antigo
      const currentSettings = await GarageService.getSettings(req.garage.id);
      const oldLogoUrl = currentSettings?.logoUrl;

      // Processa upload de logo se houver (URL do R2 vem do middleware uploadToR2)
      const uploadedUrls = (req as any).uploadedUrls || [];
      if (uploadedUrls.length > 0) {
        // Deleta logo antigo do R2 se existir
        if (oldLogoUrl) {
          try {
            await StorageService.deleteImage(oldLogoUrl);
          } catch (error) {
            console.error("Error deleting old logo from R2:", error);
            // Continua mesmo se falhar a deleção
          }
        }
        updateData.logoUrl = uploadedUrls[0];
      } else if (logoUrl !== undefined) {
        // Se não houver upload mas logoUrl foi enviado (pode ser para remover)
        if (logoUrl === null || logoUrl === '') {
          // Se está removendo o logo, deleta do R2
          if (oldLogoUrl) {
            try {
              await StorageService.deleteImage(oldLogoUrl);
            } catch (error) {
              console.error("Error deleting logo from R2:", error);
            }
          }
        }
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

