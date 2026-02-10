import { prisma } from "../prisma/client";
import { CarStatus } from "@prisma/client";

export interface CreateCarData {
  brandId: string;
  model: string;
  year: number;
  price: number;
  mileage?: number;
  description?: string;
  images?: string[];
}

export interface UpdateCarData {
  brandId?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage?: number;
  description?: string;
  status?: CarStatus;
  images?: string[];
}

export class CarService {
  static async listCars(garageId: string, status?: CarStatus) {
    const where: any = { garageId };
    
    if (status) {
      where.status = status;
    }

    return await prisma.car.findMany({
      where,
      include: {
        brand: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getCar(id: string, garageId: string) {
    return await prisma.car.findFirst({
      where: {
        id,
        garageId,
      },
      include: {
        brand: true,
      },
    });
  }

  static async createCar(garageId: string, data: CreateCarData) {
    return await prisma.car.create({
      data: {
        ...data,
        garageId,
      },
      include: {
        brand: true,
      },
    });
  }

  static async updateCar(id: string, garageId: string, data: UpdateCarData) {
    const result = await prisma.car.updateMany({
      where: {
        id,
        garageId,
      },
      data,
    });
    
    // Retorna o carro atualizado com a marca
    if (result.count > 0) {
      return await prisma.car.findFirst({
        where: { id, garageId },
        include: { brand: true },
      });
    }
    
    return result;
  }

  static async deleteCar(id: string, garageId: string) {
    return await prisma.car.deleteMany({
      where: {
        id,
        garageId,
      },
    });
  }
}

