import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Criar marcas de carros
  const brands = [
    "Fiat", "Volkswagen", "Chevrolet", "Ford", "Toyota", "Honda", "Hyundai",
    "Nissan", "Renault", "Peugeot", "Citroën", "Jeep", "Ram", "Mitsubishi",
    "Subaru", "Suzuki", "Audi", "BMW", "Mercedes-Benz", "Volvo", "Land Rover",
    "Jaguar", "Porsche", "Lexus", "Infiniti", "Acura", "Cadillac", "Lincoln",
    "Chrysler", "Dodge", "Kia", "Mazda", "Mini", "Smart", "Alfa Romeo",
    "Ferrari", "Lamborghini", "Maserati", "Bentley", "Rolls-Royce", "Aston Martin",
    "McLaren", "Tesla", "BYD", "Caoa Chery", "GWM", "JAC", "Lifan", "Troller",
    "Agrale", "Mahindra", "SsangYong", "Iveco", "Foton", "Shineray", "Effa",
    "Geely", "Haval", "Peugeot", "Citroën", "DS", "Opel", "Vauxhall"
  ];

  console.log("📦 Creating brands...");
  for (const brandName of brands) {
    await prisma.brand.upsert({
      where: { name: brandName },
      update: {},
      create: {
        name: brandName,
        active: true,
      },
    });
  }
  console.log(`✅ Created ${brands.length} brands`);

  // Criar garagem padrão para localhost
  const defaultGarage = await prisma.garage.upsert({
    where: { domain: "localhost" },
    update: {},
    create: {
      name: "AutoCore",
      domain: "localhost",
      primaryColor: "#1d73ed",
      secondaryColor: "#4285F4",
      whatsapp: "+5511999999999",
      active: true,
    },
  });

  // Criar garagem 1
  const garage1 = await prisma.garage.upsert({
    where: { domain: "garagem1.localhost" },
    update: {},
    create: {
      name: "Garagem 1",
      domain: "garagem1.localhost",
      primaryColor: "#FF0000",
      secondaryColor: "#0000FF",
      whatsapp: "+5511999999999",
      active: true,
    },
  });

  // Criar garagem 2
  const garage2 = await prisma.garage.upsert({
    where: { domain: "garagem2.localhost" },
    update: {},
    create: {
      name: "Garagem 2",
      domain: "garagem2.localhost",
      primaryColor: "#00FF00",
      secondaryColor: "#FF00FF",
      whatsapp: "+5511888888888",
      active: true,
    },
  });

  // Criar usuário admin para garagem 1
  const hashedPassword1 = await bcrypt.hash("senha123", 10);
  await prisma.user.upsert({
    where: { email: "admin@garagem1.com" },
    update: {},
    create: {
      email: "admin@garagem1.com",
      password: hashedPassword1,
      name: "Admin Garagem 1",
      role: "ADMIN",
      garageId: garage1.id,
    },
  });

  // Criar usuário admin para garagem 2
  const hashedPassword2 = await bcrypt.hash("senha123", 10);
  await prisma.user.upsert({
    where: { email: "admin@garagem2.com" },
    update: {},
    create: {
      email: "admin@garagem2.com",
      password: hashedPassword2,
      name: "Admin Garagem 2",
      role: "ADMIN",
      garageId: garage2.id,
    },
  });

  // Buscar marcas para usar nos carros
  const toyota = await prisma.brand.findUnique({ where: { name: "Toyota" } });
  const honda = await prisma.brand.findUnique({ where: { name: "Honda" } });
  const bmw = await prisma.brand.findUnique({ where: { name: "BMW" } });

  if (!toyota || !honda || !bmw) {
    throw new Error("Brands not found");
  }

  // Criar alguns carros de exemplo para garagem padrão
  await prisma.car.createMany({
    data: [
      {
        garageId: defaultGarage.id,
        brandId: toyota.id,
        model: "Corolla",
        year: 2023,
        price: 120000,
        mileage: 0,
        description: "Carro novo, zero km",
        status: "AVAILABLE",
      },
      {
        garageId: defaultGarage.id,
        brandId: honda.id,
        model: "Civic",
        year: 2022,
        price: 110000,
        mileage: 15000,
        description: "Semi-novo, único dono",
        status: "AVAILABLE",
      },
      {
        garageId: defaultGarage.id,
        brandId: bmw.id,
        model: "M4 Competition",
        year: 2022,
        price: 84500,
        mileage: 12450,
        description: "Pristine condition 2022 BMW M4 Competition featuring the Executive Package, Carbon Fiber interior trim, and M Shadowline headlights. One owner, non-smoker, and garage kept since purchase.",
        status: "AVAILABLE",
      },
    ],
    skipDuplicates: true,
  });

  // Criar alguns carros de exemplo para garagem 1
  await prisma.car.createMany({
    data: [
      {
        garageId: garage1.id,
        brandId: toyota.id,
        model: "Corolla",
        year: 2023,
        price: 120000,
        mileage: 0,
        description: "Carro novo, zero km",
        status: "AVAILABLE",
      },
      {
        garageId: garage1.id,
        brandId: honda.id,
        model: "Civic",
        year: 2022,
        price: 110000,
        mileage: 15000,
        description: "Semi-novo, único dono",
        status: "AVAILABLE",
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

