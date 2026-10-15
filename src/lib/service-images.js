const maxImageBytes = 1024 * 1024;

export function parseServiceImage(dataUrl) {
  if (dataUrl === null) return { imageData: null, mimeType: null };
  if (typeof dataUrl !== 'string' || dataUrl.length > maxImageBytes * 1.4) return null;

  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) return null;

  const imageData = Buffer.from(match[2], 'base64');
  if (!imageData.length || imageData.length > maxImageBytes) return null;

  const signatures = {
    'image/jpeg': imageData[0] === 0xff && imageData[1] === 0xd8 && imageData[2] === 0xff,
    'image/png': imageData.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/webp': imageData.toString('ascii', 0, 4) === 'RIFF' && imageData.toString('ascii', 8, 12) === 'WEBP',
  };
  if (!signatures[match[1]]) return null;

  return { imageData, mimeType: match[1] };
}

export function getServiceImageUrl(id, hasImage) {
  return hasImage ? `/api/services/${id}/image` : null;
}