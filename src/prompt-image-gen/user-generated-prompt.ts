export function create_user_generated_prompt(
  imageDescriptions: string[],
  user_prompt: string
): string {
  //
  // First image is the base, rest are source images
  const baseImage = imageDescriptions[0];
  const sourceImages = imageDescriptions.slice(1);

  return `
TASK: Create a photorealistic composite by integrating objects from images into the living space.

BASE LIVING SPACE (FIRST IMAGE):
${baseImage}
- Use this as the foundation - preserve the room's layout, lighting, and atmosphere
- You may replace existing furniture or objects in the living space if needed to improve composition 

${sourceImages.length > 0 ? composition_prompt : ""}

USER PROMPT:
${user_prompt}
`;
}

const composition_prompt = `
OBJECTS TO ADD (OTHER IMAGES):
    - These images contain furniture and decor items to extract and add to the living space
    - Do NOT alter the content of these additive images; only extract and place the objects naturally into the scene

The final result must look like all objects were photographed together in the same room with the same camera and lighting
`;
