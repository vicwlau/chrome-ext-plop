import "./definitions"; // Ensure type definitions are loaded
import type { LanguageModelSession, SessionConfig } from "./definitions";

let sessions: { id: string; session: LanguageModelSession }[] = [];

export async function create_session(
  config: SessionConfig
): Promise<{ id: string; session: LanguageModelSession }> {
  // Check availability first
  const availability = await LanguageModel.availability();
  if (availability === "unavailable") {
    throw new Error("Language model is not available");
  }

  const new_session = await LanguageModel.create({
    initialPrompts: config.initialPrompts,
    temperature: config.temperature ?? 0.7,
    topK: config.topK ?? 3,
    expectedInputs: config.expectedInputs,
    expectedOutputs: config.outputLanguage
      ? [{ type: "text" as const, languages: [config.outputLanguage] }]
      : config.expectedOutputs,
  });

  const uuid = crypto.randomUUID();
  sessions.push({ id: uuid, session: new_session });
  return { id: uuid, session: new_session };
}

export async function get_session(
  id: string
): Promise<LanguageModelSession | undefined> {
  const entry = sessions.find((s) => s.id === id);
  return entry?.session;
}

export function destroy_session(id: string): void {
  const index = sessions.findIndex((s) => s.id === id);
  if (index !== -1) {
    sessions[index].session.destroy();
    sessions.splice(index, 1);
  }
}

export function list_sessions(): {
  id: string;
  session: LanguageModelSession;
}[] {
  return sessions;
}

export async function clear_all_sessions(): Promise<void> {
  for (const { session } of sessions) {
    session.destroy();
  }
  sessions = [];
}

// Example usage function
export async function example_usage() {
  try {
    // Create a session
    const { session } = await create_session({
      initialPrompts: [
        { role: "system", content: "You are a helpful assistant." },
      ],
      temperature: 0.8,
      outputLanguage: "en",
    });

    // Use the session
    const response = await session.prompt("Hello, how are you?");
    console.log(response);

    // Or with structured prompts
    const followup = await session.prompt([
      { role: "user", content: "Tell me a joke." },
    ]);
    console.log("Joke:", followup);

    // Streaming response
    const stream = session.promptStreaming("Write a short story.");
    const reader = stream.getReader();
    let fullResponse = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += value;
        console.log("Chunk:", value);
      }
    } finally {
      reader.releaseLock();
    }
    console.log("Full story:", fullResponse);

    // Append more context
    await session.append([{ role: "user", content: "Now make it funnier." }]);

    // Clone session
    const clonedSession = await session.clone();
    console.log("Cloned session created");

    // Clean up
    session.destroy();
    clonedSession.destroy();
  } catch (error) {
    console.error("Error:", error);
  }
}
