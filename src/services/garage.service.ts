import { prisma } from "../prisma/client";

export class GarageService {
  static async findByDomain(domain: string) {
    return await prisma.garage.findUnique({
      where: { domain },
    });
  }

  static async getSettings(garageId: string) {
    return await prisma.garage.findUnique({
      where: { id: garageId },
      select: {
        id: true,
        name: true,
        domain: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        whatsapp: true,
        active: true,
      },
    });
  }

  static async updateSettings(garageId: string, data: {
    name?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    whatsapp?: string;
    active?: boolean;
  }) {
    return await prisma.garage.update({
      where: { id: garageId },
      data,
    });
  }
}

