/**
 * Reduce la foto a máximo `lado` px en JPEG: sube rápido desde datos móviles
 * y cabe de sobra en los límites del análisis de imagen.
 */
export async function redimensionarFoto(archivo: File, lado = 1280, calidad = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la foto."))), "image/jpeg", calidad),
  );
}
