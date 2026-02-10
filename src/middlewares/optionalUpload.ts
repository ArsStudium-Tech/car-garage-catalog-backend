import { Request, Response, NextFunction } from "express";
import { upload } from "./upload";

// Middleware que aplica multer apenas se o content-type for multipart/form-data
export function optionalUpload(fieldName: string, maxCount?: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers['content-type'] || '';
    
    // Se for FormData, aplica o multer
    if (contentType.includes('multipart/form-data')) {
      const multerMiddleware = maxCount 
        ? upload.array(fieldName, maxCount)
        : upload.single(fieldName);
      
      return multerMiddleware(req, res, next);
    }
    
    // Se não for FormData (JSON ou outro), apenas passa para o próximo middleware
    // O express.json() já processou o body se necessário
    next();
  };
}

