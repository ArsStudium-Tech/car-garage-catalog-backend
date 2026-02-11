import { Request, Response, NextFunction } from "express";
import { upload, uploadToR2 } from "./upload";

// Middleware que aplica multer apenas se o content-type for multipart/form-data
export function optionalUpload(fieldName: string, maxCount?: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers['content-type'] || '';
    
    // Se for FormData, aplica o multer e depois faz upload para R2
    if (contentType.includes('multipart/form-data')) {
      const multerMiddleware = maxCount 
        ? upload.array(fieldName, maxCount)
        : upload.single(fieldName);
      
      // Primeiro processa com multer
      // Usa type assertion para resolver conflito de tipos entre Express e Multer
      multerMiddleware(req as any, res as any, async (err: any) => {
        if (err) {
          return next(err);
        }
        
        // Depois faz upload para R2
        await uploadToR2(req, res, next);
      });
    } else {
      // Se não for FormData (JSON ou outro), apenas passa para o próximo middleware
      // O express.json() já processou o body se necessário
      next();
    }
  };
}

