/** Read an image file and downscale it to a JPEG data URL (keeps payloads small). */
export function fileToDataUrl(file, maxSize = 1100, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read that image.'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export const filesToDataUrls = async (files, max = 3) => {
  const list = Array.from(files || []).slice(0, max);
  const out = [];
  for (const file of list) {
    try {
      out.push(await fileToDataUrl(file));
    } catch {
      /* skip invalid file */
    }
  }
  return out;
};
