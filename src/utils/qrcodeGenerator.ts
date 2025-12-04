import QRCode from 'qrcode';
import { ApiError } from './ApiError';

/**
 * Generate QR code as Data URL
 * @param text - Text to encode
 * @returns Data URL string (base64)
 */
export const generateQRCode = async (text: string): Promise<string> => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new ApiError(500, 'Error generating QR code');
  }
};

/**
 * Generate menu URL for QR code
 * @param storeId - Store ID
 * @param tableId - Table ID
 * @param baseUrl - Frontend base URL (e.g., http://localhost:3000)
 * @returns Full menu URL
 */
export const generateMenuUrl = (storeId: string, tableId: string, baseUrl?: string): string => {
  const frontendUrl = baseUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${frontendUrl}/menu/${storeId}?table=${tableId}`;
};