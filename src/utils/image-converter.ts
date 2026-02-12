import sharp from "sharp";

/**
 * Converte uma imagem para WebP
 * @param buffer Buffer da imagem original
 * @param mimetype Tipo MIME da imagem original
 * @returns Buffer convertido para WebP e o novo mimetype
 */
export async function convertToWebP(
  buffer: Buffer,
  mimetype: string
): Promise<{ buffer: Buffer; mimetype: string }> {
  try {
    // Se já for WebP, retorna sem conversão
    if (mimetype === "image/webp") {
      return { buffer, mimetype };
    }

    // Converte para WebP com qualidade de 85% (boa qualidade e tamanho reduzido)
    const webpBuffer = await sharp(buffer)
      .webp({ quality: 85 })
      .toBuffer();

    return {
      buffer: webpBuffer,
      mimetype: "image/webp",
    };
  } catch (error) {
    console.error("Error converting image to WebP:", error);
    // Em caso de erro, retorna a imagem original
    return { buffer, mimetype };
  }
}

