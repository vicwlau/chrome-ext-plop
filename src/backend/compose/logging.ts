/**
 * Logging utilities for composition API
 */

export function logCompositionRequest(
  files: Express.Multer.File[],
  prompt: string
) {
  const fileSizes = files.map((f) => f.size);
  const totalSize = fileSizes.reduce((sum, size) => sum + size, 0);
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

  console.log("=== Composition Request ===");
  console.log("Image count:", files.length);
  console.log("Image order:");
  files.forEach((file, i) => {
    const label = i === 0 ? "[BASE/SOURCE]" : `[ELEMENT ${i}]`;
    console.log(
      `  ${label} Image ${i + 1}: ${file.originalname} (${(
        file.size /
        1024 /
        1024
      ).toFixed(2)} MB)`
    );
  });
  console.log("Prompt:", prompt);
  console.log(`Total size: ${totalSizeMB} MB`);
}

export function logValidationSuccess() {
  console.log("✅ Size validation passed");
}

export function logValidationError(error: string) {
  console.error(`❌ ${error}`);
}

export function logBase64Sizes(
  imageParts: Array<{ inlineData: { data: string } }>
) {
  const base64Sizes = imageParts.map((part, i) => {
    const base64Size = part.inlineData.data.length;
    const base64SizeMB = (base64Size / (1024 * 1024)).toFixed(2);
    return `Image ${i + 1} (base64): ${base64SizeMB} MB`;
  });

  // Note: Base64 encoding overhead means a 15MB original file becomes ~20MB encoded
  // This is why we limit individual files to 10MB to stay under the 20MB API limit
  console.log("Base64 encoded sizes:", base64Sizes.join(", "));
}

export function logCompositionRequest_API(
  files: Express.Multer.File[],
  prompt: string
) {
  console.log("Sending composition request with prompt:", prompt);
  console.log("Number of images:", files.length);
}

export function logSuccess() {
  console.log("Successfully composed images");
}

export function logError(error: unknown) {
  console.error("Error composing images:", error);
}
