export function create_prompt_compose_objects(
  imageDescriptions: string[],
  isGridCombined: boolean = false,
  placementRecommendations?: string
): string {
  // First image is the base, rest are source images
  const baseImage = imageDescriptions[0];
  const sourceImages = imageDescriptions.slice(1);

  return `
  

TASK: Create a photorealistic composite by integrating objects from images into the living space.

BASE LIVING SPACE (FIRST IMAGE):
${baseImage}
- Use this as the foundation - preserve the room's layout, lighting, and atmosphere
- You may replace existing furniture or objects in the living space if needed to improve composition 

OBJECTS TO ADD (OTHER IMAGES):
- These images contain furniture and decor items to extract and add to the living space
- Do NOT alter the content of these additive images; only extract and place the objects naturally into the scene

The final result must look like all objects were photographed together in the same room with the same camera and lighting

`;
}

/*
not used

  const placementInstruction = placementRecommendations
    ? `${placementRecommendations}\n\nFollow these placement recommendations closely while ensuring the objects blend naturally with the scene.`
    : "\nExtract the main objects from the additional images and place them naturally into the first image's scene.";



PLACEMENT INSTRUCTIONS:
${placementInstruction}



PLACEMENT & INTEGRATION:
- Scale objects proportionally to fit the room's perspective and depth
- Position objects naturally (furniture on floor, wall items at appropriate heights)
- Objects further back should appear smaller due to perspective
- Ensure objects don't float or appear disconnected from surfaces

LIGHTING & REALISM:
- Analyze the FIRST image's lighting: direction, intensity, color temperature (warm/cool)
- Apply matching lighting to all added objects:
  * Match shadow direction and length based on light source position
  * Cast realistic contact shadows where objects touch surfaces
  * Adjust object brightness to match the room's ambient light level
  * Match color temperature (warm tungsten, cool daylight, etc.)
- Preserve original material properties: fabric texture, wood grain, metal reflections, glass transparency
- Ensure color saturation is consistent across all elements

*/

/*
  add back later?


  

Create a professional composite photo by combining elements from multiple images.
*/

// ${gridInstruction}
// const gridInstruction =
//     isGridCombined && sourceImages.length === 1
//       ? "The SECOND image contains multiple objects arranged in a numbered grid. Each numbered cell (1, 2, 3, etc.) is a separate object to extract and add to the scene. Remove the grid backgrounds and number labels."
//       : "";

const removed = `LIGHTING & REALISM - CRITICAL:

- Analyze the lighting direction, intensity, and color temperature in the FIRST image
- Match ALL added objects to this exact lighting:
  * If the room has warm natural light, objects should have warm tones and soft shadows
  * If the room has cool artificial light, objects should have cooler tones and sharper shadows
  * If the room is bright, objects should appear well-lit with visible highlights
  * If the room is dim, objects should appear accordingly with subdued colors
- Cast realistic shadows from each object onto the floor/surfaces matching the room's light direction
- Preserve the ORIGINAL material qualities of objects (fabric looks like fabric, wood looks like wood, metal looks like metal)
- Maintain realistic texture detail on all surfaces
- Ensure color saturation matches the overall scene (don't oversaturate added objects)

`;
