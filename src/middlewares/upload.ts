import multer from "multer";
import path from "path";
import { StorageService } from "../services/storage.service";
import { Request, Response, NextFunction } from "express";

// Usa memoryStorage para manter arquivos em memória antes de fazer upload para R2
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, WEBP and AVIF are allowed."));
  }
};

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Middleware que processa uploads e faz upload para R2
export const upload = multerUpload;

// Middleware adicional que faz upload dos arquivos para R2 após multer processar
export async function uploadToR2(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      return next();
    }

    // Obtém garageId do request (deve estar disponível via middleware auth)
    const garageId = (req as any).garage?.id;
    if (!garageId) {
      return res.status(400).json({ error: "Garage ID is required" });
    }

    // Obtém carId se disponível (para updates, vem do req.params.id)
    const carId = (req as any).carId || (req as any).params?.id || null;

    let files: Express.Multer.File[] = [];
    
    if (Array.isArray(req.files)) {
      files = req.files;
    } else if (typeof req.files === 'object') {
      files = Object.values(req.files).flat();
    }

    // Armazena os arquivos no request para uso no controller
    // Isso permite que o controller faça upload após criar o carro (quando temos o carId)
    (req as any).uploadedFiles = files;

    // Se já temos carId (update) ou é logo (não precisa de carId), faz upload imediatamente
    const hasCarId = carId !== null && carId !== undefined;
    const isLogo = files.some(f => f.fieldname === 'logo');

    if (hasCarId || isLogo) {
      // Processa cada arquivo e faz upload para R2
      const uploadedUrls: string[] = [];
      
      for (const file of files) {
        if (!file.buffer) {
          continue;
        }

        // Gera nome único para o arquivo
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        
        // Determina o tipo de arquivo baseado no fieldname
        let filename: string;
        let uploadCarId: string | null = null;
        
        if (file.fieldname === 'logo') {
          // Logo da garagem
          filename = `logo-${uniqueSuffix}${ext}`;
          uploadCarId = null; // Logo não tem carId
        } else {
          // Imagem de carro
          filename = `car-${uniqueSuffix}${ext}`;
          uploadCarId = carId; // Usa carId se disponível
        }

        // Faz upload para R2 com organização por garagem e carro
        const url = await StorageService.uploadImage(
          file.buffer, 
          filename, 
          file.mimetype,
          garageId,
          uploadCarId
        );
        uploadedUrls.push(url);
      }

      // Adiciona as URLs ao request para uso no controller
      (req as any).uploadedUrls = uploadedUrls;
    } else {
      // Para createCar, não faz upload ainda (será feito no controller após criar o carro)
      (req as any).uploadedUrls = [];
    }
    
    next();
  } catch (error) {
    console.error("Error uploading to R2:", error);
    return res.status(500).json({ error: "Failed to upload images" });
  }
}

