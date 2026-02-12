/**
 * Mascara a placa do veículo, mostrando apenas o primeiro e último caractere
 * Exemplo: "ABC1234" -> "A**-***4"
 * Exemplo: "RAB1230" -> "R**-***0"
 */
export function maskLicensePlate(licensePlate: string | null | undefined): string | null {
  if (!licensePlate) {
    return null;
  }

  // Remove espaços e converte para maiúsculo
  const cleaned = licensePlate.replace(/\s/g, '').toUpperCase();
  
  if (cleaned.length === 0) {
    return null;
  }

  // Se tiver apenas 1 caractere, retorna ele
  if (cleaned.length === 1) {
    return cleaned;
  }

  // Pega o primeiro caractere
  const firstChar = cleaned[0];
  
  // Pega o último caractere
  const lastChar = cleaned[cleaned.length - 1];
  
  // Formato brasileiro: ABC1234 -> A**-***4
  // Se tiver 7 caracteres (formato antigo) ou 8 (formato Mercosul)
  if (cleaned.length === 7) {
    // Formato antigo: ABC1234
    return `${firstChar}**-***${lastChar}`;
  } else if (cleaned.length === 8) {
    // Formato Mercosul: ABC1D23
    return `${firstChar}**-***${lastChar}`;
  } else {
    // Para outros formatos, mascarar tudo exceto primeiro e último
    const middle = '*'.repeat(cleaned.length - 2);
    if (cleaned.length > 4) {
      // Adiciona hífen no meio se tiver mais de 4 caracteres
      const midPoint = Math.floor((cleaned.length - 2) / 2);
      return `${firstChar}${middle.substring(0, midPoint)}-${middle.substring(midPoint)}${lastChar}`;
    }
    return `${firstChar}${middle}${lastChar}`;
  }
}

/**
 * Aplica máscara na placa de um veículo ou array de veículos
 */
export function maskCarLicensePlate(car: any): any {
  if (!car) {
    return car;
  }

  if (Array.isArray(car)) {
    return car.map(maskCarLicensePlate);
  }

  return {
    ...car,
    licensePlate: maskLicensePlate(car.licensePlate),
  };
}

