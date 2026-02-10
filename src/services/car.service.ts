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

export interface ListCarsFilters {
  status?: CarStatus;
  brandId?: string;
  search?: string;
  year?: number;
  minPrice?: number;
  maxPrice?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  orderBy?: "price_asc" | "price_desc" | "newest" | "oldest";
}

export interface PaginatedCarsResult {
  cars: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CarService {
  static async listCars(
    garageId: string,
    filters?: ListCarsFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedCarsResult> {
    const where: any = { garageId };
    
    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.brandId) {
      where.brandId = filters.brandId;
    }

    if (filters?.year) {
      where.year = filters.year;
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        where.price.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.price.lte = filters.maxPrice;
      }
    }

    if (filters?.search) {
      where.OR = [
        { model: { contains: filters.search, mode: "insensitive" } },
        { brand: { name: { contains: filters.search, mode: "insensitive" } } },
        { year: { equals: parseInt(filters.search) || undefined } },
      ].filter((condition) => {
        // Remove condições inválidas
        if (condition.year && isNaN(condition.year.equals as number)) {
          return false;
        }
        return true;
      });
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    // Define ordenação baseada no parâmetro
    let orderBy: any = { createdAt: "desc" }; // padrão: mais novo primeiro
    
    if (pagination?.orderBy) {
      switch (pagination.orderBy) {
        case "price_asc":
          orderBy = { price: "asc" };
          break;
        case "price_desc":
          orderBy = { price: "desc" };
          break;
        case "newest":
          orderBy = { createdAt: "desc" };
          break;
        case "oldest":
          orderBy = { createdAt: "asc" };
          break;
      }
    }

    const [cars, total] = await Promise.all([
      prisma.car.findMany({
        where,
        include: {
          brand: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.car.count({ where }),
    ]);

    return {
      cars,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

