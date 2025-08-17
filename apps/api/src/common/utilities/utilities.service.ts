import { Injectable } from '@nestjs/common';

@Injectable()
export class UtilitiesService {
  /**
   * Examines an image buffer for a QR code and decodes it if present.
   * @param {Buffer} buffer - The image file as a Node.js Buffer.
   * @returns {Promise<string|null>} - The decoded QR code data (URL) if found, otherwise null.
   */
  async extractQRCodeUrlFromBuffer(buffer: Buffer): Promise<string | null> {
    try {
      const image = await Jimp.read(buffer);
      return await new Promise((resolve, reject) => {
        const qr = new QrCode();
        qr.callback = (err: Error | null, value: { result: string } | null) => {
          if (err || !value) return resolve(null);
          resolve(value.result);
        };
        qr.decode(image.bitmap);
      });
    } catch (error) {
      console.error('QR code extraction error:', error);
      return null;
    }
  }
}
