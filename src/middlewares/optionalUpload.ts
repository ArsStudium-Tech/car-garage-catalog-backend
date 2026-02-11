import { Request, Response, NextFunction } from "express";
import { upload, uploadToR2 } from "./upload";

// Middleware que aplica multer apenas se o content-type for multipart/form-data
export function optionalUpload(fieldName: string, maxCount?: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers['content-type'] || '';
    
    // Se for FormData, aplica o multer e depois faz upload para R2
    if (contentType.includes('multipart/form-data')) {
      // Usa upload.any() para processar todos os campos, incluindo arquivos e campos de texto
      // Isso garante que campos como imagesToKeep sejam processados mesmo sem arquivos
      const multerMiddleware = upload.any();
      
      // Primeiro processa com multer (processa todos os campos do FormData)
      // Usa type assertion para resolver conflito de tipos entre Express e Multer
      multerMiddleware(req as any, res as any, async (err: any) => {
        if (err) {
          return next(err);
        }
        
        // Filtra apenas os arquivos do campo especificado
        if (req.files && Array.isArray(req.files)) {
          const fieldFiles = req.files.filter((file: Express.Multer.File) => file.fieldname === fieldName);
          // Limita quantidade se especificado
          if (maxCount && fieldFiles.length > maxCount) {
            return res.status(400).json({ error: `Maximum ${maxCount} files allowed for ${fieldName}` });
          }
          // Substitui req.files pelos arquivos filtrados
          (req as any).files = fieldFiles;
        }
        
        // Depois faz upload para R2 (só se houver arquivos)
        await uploadToR2(req, res, next);
      });
    } else {
      // Se não for FormData (JSON ou outro), apenas passa para o próximo middleware
      // O express.json() já processou o body se necessário
      next();
    }
  };
}

