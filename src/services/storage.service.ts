import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
  console.warn("⚠️  R2 credentials not fully configured. Image uploads will fail.");
}

// Configurar cliente S3 para Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export class StorageService {
  /**
   * Faz upload de uma imagem para o R2
   * @param buffer Buffer do arquivo
   * @param filename Nome do arquivo
   * @param mimetype Tipo MIME do arquivo
   * @returns URL pública da imagem
   */
  static async uploadImage(
    buffer: Buffer,
    filename: string,
    mimetype: string
  ): Promise<string> {
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
      throw new Error("R2 credentials not configured");
    }

    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filename,
        Body: buffer,
        ContentType: mimetype,
      });

      await s3Client.send(command);

      // Retorna a URL pública
      // Se publicUrl termina com /, não adiciona outro /
      const url = publicUrl.endsWith("/") 
        ? `${publicUrl}${filename}` 
        : `${publicUrl}/${filename}`;

      return url;
    } catch (error) {
      console.error("Error uploading image to R2:", error);
      throw new Error("Failed to upload image to R2");
    }
  }

  /**
   * Extrai a key do objeto de uma URL do R2
   * @param url URL pública da imagem
   * @returns Key do objeto no R2
   */
  static extractKeyFromUrl(url: string): string {
    if (!url) {
      throw new Error("URL is required");
    }

    // Se for URL do R2, extrai a key
    if (url.startsWith("http")) {
      try {
        const urlObj = new URL(url);
        // Remove a barra inicial do pathname
        return urlObj.pathname.startsWith("/") 
          ? urlObj.pathname.slice(1) 
          : urlObj.pathname;
      } catch (error) {
        // Se não conseguir fazer parse, assume que a URL já é a key
        return url;
      }
    }

    // Se for caminho local antigo (/uploads/...), extrai o nome do arquivo
    if (url.startsWith("/uploads/")) {
      return url.replace("/uploads/", "");
    }

    // Caso contrário, assume que já é a key
    return url;
  }

  /**
   * Deleta uma imagem do R2
   * @param url URL pública da imagem ou key do objeto
   */
  static async deleteImage(url: string): Promise<void> {
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error("R2 credentials not configured");
    }

    try {
      const key = this.extractKeyFromUrl(url);

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await s3Client.send(command);
    } catch (error) {
      console.error("Error deleting image from R2:", error);
      // Não lança erro para não quebrar o fluxo se a imagem já não existir
      console.warn(`Failed to delete image: ${url}`);
    }
  }

  /**
   * Deleta múltiplas imagens do R2
   * @param urls Array de URLs públicas das imagens
   */
  static async deleteImages(urls: string[]): Promise<void> {
    await Promise.all(urls.map((url) => this.deleteImage(url)));
  }
}

