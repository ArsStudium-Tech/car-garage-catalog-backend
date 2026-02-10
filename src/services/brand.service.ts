import { prisma } from "../prisma/client";

export class BrandService {
  static async listBrands(activeOnly: boolean = true) {
    const where: any = {};
    
    if (activeOnly) {
      where.active = true;
    }

    return await prisma.brand.findMany({
      where,
      orderBy: { name: "asc" },
    });
  }

  static async getBrand(id: string) {
    return await prisma.brand.findUnique({
      where: { id },
    });
  }

  static async getBrandByName(name: string) {
    return await prisma.brand.findUnique({
      where: { name },
    });
  }
}

