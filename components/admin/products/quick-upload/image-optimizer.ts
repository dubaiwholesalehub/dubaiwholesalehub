const MAX_LONG_SIDE = 1600;
const LARGE_FILE_THRESHOLD = 900 * 1024;
const WEBP_QUALITY = 0.86;

export type OptimizedImageResult = {
  file: File;

  originalSize: number;
  finalSize: number;

  originalWidth: number;
  originalHeight: number;

  finalWidth: number;
  finalHeight: number;

  optimized: boolean;
};

function replaceExtension(
  fileName: string,
  extension: string,
) {
  const cleanName = fileName.replace(
    /\.[^.]+$/,
    "",
  );

  return `${cleanName}.${extension}`;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
) {
  return new Promise<Blob>(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "Unable to optimize the image.",
              ),
            );

            return;
          }

          resolve(blob);
        },
        type,
        quality,
      );
    },
  );
}

export async function optimizeProductImage(
  file: File,
): Promise<OptimizedImageResult> {
  /*
   * Animated GIFs must remain untouched.
   * Drawing them to canvas would flatten animation.
   */
  if (file.type === "image/gif") {
    return {
      file,

      originalSize: file.size,
      finalSize: file.size,

      originalWidth: 0,
      originalHeight: 0,

      finalWidth: 0,
      finalHeight: 0,

      optimized: false,
    };
  }

  const bitmap =
    await createImageBitmap(file);

  try {
    const originalWidth =
      bitmap.width;

    const originalHeight =
      bitmap.height;

    const longSide = Math.max(
      originalWidth,
      originalHeight,
    );

    const dimensionsTooLarge =
      longSide > MAX_LONG_SIDE;

    const fileTooLarge =
      file.size >
      LARGE_FILE_THRESHOLD;

    /*
     * Already-small images remain completely untouched.
     */
    if (
      !dimensionsTooLarge &&
      !fileTooLarge
    ) {
      return {
        file,

        originalSize: file.size,
        finalSize: file.size,

        originalWidth,
        originalHeight,

        finalWidth:
          originalWidth,

        finalHeight:
          originalHeight,

        optimized: false,
      };
    }

    /*
     * Never upscale.
     *
     * If dimensions exceed the limit, reduce them
     * proportionally. Otherwise retain original dimensions
     * and only attempt compression.
     */
    const scale =
      dimensionsTooLarge
        ? MAX_LONG_SIDE /
          longSide
        : 1;

    const finalWidth =
      Math.max(
        1,
        Math.round(
          originalWidth *
            scale,
        ),
      );

    const finalHeight =
      Math.max(
        1,
        Math.round(
          originalHeight *
            scale,
        ),
      );

    const canvas =
      document.createElement(
        "canvas",
      );

    canvas.width =
      finalWidth;

    canvas.height =
      finalHeight;

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Image optimization is not supported by this browser.",
      );
    }

    /*
     * Good-quality browser resampling.
     */
    context.imageSmoothingEnabled =
      true;

    context.imageSmoothingQuality =
      "high";

    context.drawImage(
      bitmap,
      0,
      0,
      finalWidth,
      finalHeight,
    );

    const blob =
      await canvasToBlob(
        canvas,
        "image/webp",
        WEBP_QUALITY,
      );

    const optimizedFile =
      new File(
        [blob],
        replaceExtension(
          file.name,
          "webp",
        ),
        {
          type: "image/webp",
          lastModified:
            Date.now(),
        },
      );

    /*
     * If dimensions did NOT require resizing and WebP did
     * not save space, retain the original image.
     */
    if (
      !dimensionsTooLarge &&
      optimizedFile.size >=
        file.size
    ) {
      return {
        file,

        originalSize:
          file.size,

        finalSize:
          file.size,

        originalWidth,
        originalHeight,

        finalWidth:
          originalWidth,

        finalHeight:
          originalHeight,

        optimized: false,
      };
    }

    return {
      file: optimizedFile,

      originalSize:
        file.size,

      finalSize:
        optimizedFile.size,

      originalWidth,
      originalHeight,

      finalWidth,
      finalHeight,

      optimized: true,
    };
  } finally {
    bitmap.close();
  }
}

export function formatImageSize(
  bytes: number,
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(0)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}