import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

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
    accessKeyId: accessKeyId || "",
    secretAccessKey: secretAccessKey || "",
  },
});

export class StorageService {
  /**
   * Faz upload de uma imagem para o R2
   * @param buffer Buffer do arquivo
   * @param filename Nome do arquivo
   * @param mimetype Tipo MIME do arquivo
   * @param garageId ID da garagem (obrigatório)
   * @param carId ID do carro (opcional, para logos use null)
   * @returns URL pública da imagem
   */
  static async uploadImage(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    garageId: string,
    carId?: string | null
  ): Promise<string> {
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
      throw new Error("R2 credentials not configured");
    }

    if (!garageId) {
      throw new Error("garageId is required");
    }

    try {
      // Organiza a estrutura: {garageId}/{carId}/filename ou {garageId}/logos/filename
      let key: string;
      if (carId) {
        // Imagem de carro: garageId/carId/filename
        key = `${garageId}/${carId}/${filename}`;
      } else {
        // Logo ou outro arquivo da garagem: garageId/logos/filename
        key = `${garageId}/logos/${filename}`;
      }

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      });

      await s3Client.send(command);

      // Retorna a URL pública
      // Se publicUrl termina com /, não adiciona outro /
      const url = publicUrl.endsWith("/") 
        ? `${publicUrl}${key}` 
        : `${publicUrl}/${key}`;

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

    // Se for URL completa com protocolo (http:// ou https://)
    if (url.startsWith("http://") || url.startsWith("https://")) {
      try {
        const urlObj = new URL(url);
        // Remove a barra inicial do pathname para obter a key completa
        let key = urlObj.pathname.startsWith("/") 
          ? urlObj.pathname.slice(1) 
          : urlObj.pathname;
        
        // Remove query strings e fragments se houver
        if (urlObj.search) {
          key = key.split('?')[0];
        }
        
        console.log(`Extracted key from URL - URL: ${url}, Key: ${key}`);
        return key;
      } catch (error) {
        console.error(`Error parsing URL: ${url}`, error);
        // Se não conseguir fazer parse, tenta extrair manualmente
        const match = url.match(/https?:\/\/[^\/]+(\/.+)/);
        if (match && match[1]) {
          return match[1].slice(1); // Remove a barra inicial
        }
        return url;
      }
    }

    // Se a URL não tem protocolo mas parece ter um domínio (ex: car-imgs.bikoservicos.com.br/garageId/carId/file.jpg)
    // Remove o domínio e mantém apenas o path
    if (url.includes('/') && !url.startsWith('/') && !url.startsWith('http')) {
      // Procura pelo padrão de UUID (garageId e carId são UUIDs)
      // UUIDs têm formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidPattern = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
      const uuidMatch = url.match(uuidPattern);
      
      if (uuidMatch) {
        // Encontra a posição do primeiro UUID (que é o garageId)
        const uuidIndex = url.indexOf(uuidMatch[1]);
        // Pega tudo a partir do primeiro UUID
        const key = url.substring(uuidIndex);
        console.log(`Extracted key from URL without protocol - URL: ${url}, Key: ${key}`);
        return key;
      }
      
      // Fallback: tenta encontrar o primeiro '/' após o domínio
      const firstSlashIndex = url.indexOf('/');
      if (firstSlashIndex > 0) {
        // Pega tudo após o primeiro '/' (garageId/carId/file.jpg)
        const key = url.substring(firstSlashIndex + 1);
        console.log(`Extracted key from URL without protocol (fallback) - URL: ${url}, Key: ${key}`);
        return key;
      }
    }

    // Se for caminho local antigo (/uploads/...), extrai o nome do arquivo
    if (url.startsWith("/uploads/")) {
      return url.replace("/uploads/", "");
    }

    // Se começa com /, remove
    if (url.startsWith("/")) {
      return url.slice(1);
    }

    // Caso contrário, assume que já é a key
    console.log(`Using URL as key directly - URL: ${url}`);
    return url;
  }

  /**
   * Deleta uma imagem do R2
   * Tenta deletar tanto com a estrutura completa quanto sem ela (para imagens antigas)
   * @param url URL pública da imagem ou key do objeto
   * @param garageId ID da garagem (opcional, para tentar deletar com estrutura de pastas)
   * @param carId ID do carro (opcional, para tentar deletar com estrutura de pastas)
   */
  static async deleteImage(url: string, garageId?: string, carId?: string): Promise<void> {
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error("R2 credentials not configured");
    }

    const key = this.extractKeyFromUrl(url);
    console.log(`Attempting to delete from R2 - URL: ${url}, Extracted Key: ${key}, garageId: ${garageId}, carId: ${carId}`);

    // Lista de keys para tentar deletar
    const keysToTry: string[] = [key];

    // Se a key extraída já tem estrutura de pastas, usa ela diretamente
    // Se não tem estrutura e temos garageId/carId, tenta construir a key completa
    if (garageId && carId) {
      if (!key.includes('/')) {
        // Key é apenas o filename, constrói a estrutura completa
        const structuredKey = `${garageId}/${carId}/${key}`;
        keysToTry.unshift(structuredKey); // Tenta primeiro com estrutura completa
        console.log(`Constructed structured key: ${structuredKey}`);
      } else {
        // Key já tem estrutura, mas verifica se está correta
        // Se a key não começa com garageId/carId, tenta reconstruir
        if (!key.startsWith(`${garageId}/${carId}/`)) {
          // Extrai apenas o filename da key atual
          const filename = key.split('/').pop() || key;
          const correctKey = `${garageId}/${carId}/${filename}`;
          keysToTry.unshift(correctKey);
          console.log(`Reconstructed key: ${correctKey} (original: ${key})`);
        }
      }
    }

    // Tenta deletar cada key até conseguir
    let deleted = false;
    let lastError: any = null;
    
    for (const tryKey of keysToTry) {
      try {
        console.log(`Trying to delete key: ${tryKey}`);
        const command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: tryKey,
        });

        await s3Client.send(command);
        console.log(`✅ Successfully deleted from R2 - Key: ${tryKey}`);
        deleted = true;
        break; // Se conseguiu deletar, para de tentar
      } catch (error: any) {
        lastError = error;
        if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
          // Imagem não encontrada neste local, tenta o próximo
          console.log(`❌ Image not found at key: ${tryKey}, trying next...`);
          continue;
        } else {
          // Outro tipo de erro, loga mas continua tentando
          console.error(`⚠️ Error deleting image at key ${tryKey}:`, error.message, error.name);
        }
      }
    }

    if (!deleted) {
      console.error(`❌ Failed to delete image from R2 - URL: ${url}`);
      console.error(`   Tried keys: ${keysToTry.join(', ')}`);
      console.error(`   Last error:`, lastError?.message || 'Unknown error');
    }
  }

  /**
   * Lista todas as imagens do R2 para um carro específico
   * @param garageId ID da garagem
   * @param carId ID do carro
   * @returns Array de keys das imagens no R2
   */
  static async listCarImages(garageId: string, carId: string): Promise<string[]> {
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error("R2 credentials not configured");
    }

    try {
      const prefix = `${garageId}/${carId}/`;
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
      });

      const response = await s3Client.send(command);
      const keys = (response.Contents || []).map(obj => obj.Key || '').filter(Boolean);
      
      console.log(`Found ${keys.length} images in R2 for car ${carId}:`, keys);
      return keys;
    } catch (error) {
      console.error("Error listing car images from R2:", error);
      return [];
    }
  }

  /**
   * Deleta múltiplas imagens do R2
   * @param urls Array de URLs públicas das imagens a deletar
   * @param garageId ID da garagem (opcional, para tentar deletar com estrutura de pastas)
   * @param carId ID do carro (opcional, para tentar deletar com estrutura de pastas)
   * @param imagesToKeep Array de URLs das imagens que devem ser mantidas (para comparar e deletar órfãs)
   */
  static async deleteImages(urls: string[], garageId?: string, carId?: string, imagesToKeep?: string[]): Promise<void> {
    console.log(`Attempting to delete ${urls.length} images from R2`, { garageId, carId });
    
    // Se temos garageId e carId, lista todas as imagens do R2 e compara com as que devem ser mantidas
    if (garageId && carId) {
      try {
        const imagesInR2 = await this.listCarImages(garageId, carId);
        console.log(`📋 Found ${imagesInR2.length} images in R2 for car ${carId}`);
        
        if (imagesToKeep && imagesToKeep.length > 0) {
          // Converte URLs finais para keys para comparação
          const keysToKeep = imagesToKeep.map(url => {
            const key = this.extractKeyFromUrl(url);
            // Se a key não começa com garageId/carId, reconstrói
            if (!key.startsWith(`${garageId}/${carId}/`)) {
              const filename = key.split('/').pop() || key;
              return `${garageId}/${carId}/${filename}`;
            }
            return key;
          });
          
          console.log(`📋 Keys to keep:`, keysToKeep);
          
          // Encontra imagens no R2 que NÃO estão na lista de manter = DELETAR
          const orphanedImages = imagesInR2.filter(key => !keysToKeep.includes(key));
          
          if (orphanedImages.length > 0) {
            console.log(`🗑️ Found ${orphanedImages.length} ORPHANED images in R2, deleting...`, orphanedImages);
            // Deleta imagens órfãs
            for (const key of orphanedImages) {
              try {
                const command = new DeleteObjectCommand({
                  Bucket: bucketName,
                  Key: key,
                });
                await s3Client.send(command);
                console.log(`✅ Deleted orphaned image: ${key}`);
              } catch (error: any) {
                console.error(`❌ Failed to delete orphaned image ${key}:`, error.message);
              }
            }
          } else {
            console.log(`✅ No orphaned images found in R2`);
          }
        }
      } catch (error) {
        console.error("Error checking orphaned images:", error);
      }
    }
    
    // Deleta as imagens solicitadas explicitamente
    if (urls.length > 0) {
      const results = await Promise.allSettled(
        urls.map((url) => this.deleteImage(url, garageId, carId))
      );
      
      // Log dos resultados
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to delete image ${index + 1}: ${urls[index]}`, result.reason);
        } else {
          console.log(`Successfully deleted image ${index + 1}: ${urls[index]}`);
        }
      });
    }
  }
}

