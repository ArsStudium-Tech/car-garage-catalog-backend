import { prisma } from "../prisma/client";

export class GarageService {
  static async findByDomain(domain: string) {
    return await prisma.garage.findUnique({
      where: { domain },
    });
  }

  static async getSettings(garageId: string) {
    const garage = await prisma.garage.findUnique({
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
        logradouro: true,
        bairro: true,
        numero: true,
        cidade: true,
        estado: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!garage) {
      return null;
    }

    // Transforma os campos de endereço em um objeto e remove os campos individuais
    const { logradouro, bairro, numero, cidade, estado, latitude, longitude, ...garageWithoutAddress } = garage;
    
    return {
      ...garageWithoutAddress,
      endereco: {
        logradouro,
        bairro,
        numero,
        cidade,
        estado,
        latitude,
        longitude,
      },
    };
  }

  static async updateSettings(garageId: string, data: {
    name?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    whatsapp?: string;
    active?: boolean;
    endereco?: {
      logradouro?: string;
      bairro?: string;
      numero?: string;
      cidade?: string;
      estado?: string;
      latitude?: number;
      longitude?: number;
    };
  }) {
    // Separa os dados de endereço dos outros campos
    const { endereco, ...otherData } = data;
    
    const updateData: any = { ...otherData };
    
    // Se endereco foi fornecido, adiciona os campos separados
    if (endereco) {
      if (endereco.logradouro !== undefined) updateData.logradouro = endereco.logradouro;
      if (endereco.bairro !== undefined) updateData.bairro = endereco.bairro;
      if (endereco.numero !== undefined) updateData.numero = endereco.numero;
      if (endereco.cidade !== undefined) updateData.cidade = endereco.cidade;
      if (endereco.estado !== undefined) updateData.estado = endereco.estado;
      if (endereco.latitude !== undefined) updateData.latitude = endereco.latitude;
      if (endereco.longitude !== undefined) updateData.longitude = endereco.longitude;
    }

    const updated = await prisma.garage.update({
      where: { id: garageId },
      data: updateData,
    });

    // Retorna no formato com objeto endereco, removendo os campos individuais
    const { logradouro, bairro, numero, cidade, estado, latitude, longitude, ...updatedWithoutAddress } = updated;
    
    return {
      ...updatedWithoutAddress,
      endereco: {
        logradouro,
        bairro,
        numero,
        cidade,
        estado,
        latitude,
        longitude,
      },
    };
  }
}

