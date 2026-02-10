import express from "express";
import cors from "cors";
import path from "path";
import publicRoutes from "./routes/public.routes";
import adminRoutes from "./routes/admin.routes";
import authRoutes from "./routes/auth.routes";

export const app = express();

app.use(cors());

// Middleware para bloquear parsers de body para multipart/form-data
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  
  // Marca a requisição se for multipart para evitar parsing
  if (contentType.includes('multipart/form-data')) {
    (req as any).isMultipart = true;
  }
  
  next();
});

// Body parsers - CRÍTICO: não aplicar para multipart/form-data
app.use((req, res, next) => {
  // Se for multipart, pula todos os parsers
  if ((req as any).isMultipart) {
    return next();
  }
  
  const contentType = req.headers['content-type'] || '';
  
  // Aplica JSON parser apenas para application/json
  if (contentType.includes('application/json')) {
    return express.json()(req, res, next);
  }
  
  // Aplica urlencoded para application/x-www-form-urlencoded
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return express.urlencoded({ extended: true })(req, res, next);
  }
  
  // Para outros tipos, apenas passa adiante
  next();
});

// Servir arquivos estáticos (uploads)
const uploadDir = process.env.UPLOAD_DIR || "./uploads";
app.use("/uploads", express.static(path.resolve(uploadDir)));

// Rotas
app.use("/public", publicRoutes);
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  
  // Tratamento específico para erros de parsing JSON
  if (err instanceof SyntaxError && 'body' in err) {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      return res.status(400).json({ 
        error: "Invalid request format. FormData should be processed by multer, not JSON parser." 
      });
    }
    return res.status(400).json({ error: "Invalid JSON" });
  }
  
  if (err instanceof Error) {
    return res.status(500).json({ error: err.message });
  }
  
  res.status(500).json({ error: "Internal server error" });
});

