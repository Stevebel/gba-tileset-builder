export async function imageToCanvas(dataUrl: string) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const imageCanvas = document.createElement('canvas');
  imageCanvas.width = img.width;
  imageCanvas.height = img.height;
  const ctx = imageCanvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return imageCanvas;
}
