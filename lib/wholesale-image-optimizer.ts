const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;

export async function optimizeWholesaleImage(
  file: File,
): Promise<File> {
  const image = await createImageBitmap(file);

  try {
    const scale = Math.min(
      1,
      MAX_DIMENSION /
        Math.max(image.width, image.height),
    );

    const width = Math.max(
      1,
      Math.round(image.width * scale),
    );

    const height = Math.max(
      1,
      Math.round(image.height * scale),
    );

    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Unable to prepare image for upload.",
      );
    }

    context.drawImage(
      image,
      0,
      0,
      width,
      height,
    );

    const blob = await new Promise<Blob>(
      (resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(
                new Error(
                  "Unable to optimize image.",
                ),
              );
            }
          },
          "image/webp",
          WEBP_QUALITY,
        );
      },
    );

    const baseName =
      file.name.replace(/\.[^.]+$/, "") ||
      "collection-photo";

    return new File(
      [blob],
      `${baseName}.webp`,
      {
        type: "image/webp",
        lastModified: file.lastModified,
      },
    );
  } finally {
    image.close();
  }
}