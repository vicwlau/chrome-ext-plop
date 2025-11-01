// todo Minimal type definitions for Chrome Prompt API (to be replaced when official types are available)

export interface LanguageModel {
  availability(): Promise<
    "unavailable" | "downloadable" | "downloading" | "available"
  >;
  params(): Promise<{
    defaultTopK: number;
    maxTopK: number;
    defaultTemperature: number;
    maxTemperature: number;
  }>;
  create(options?: CreateOptions): Promise<LanguageModelSession>;
}

export interface CreateOptions {
  temperature?: number;
  topK?: number;
  signal?: AbortSignal;
  initialPrompts?: Message[];
  expectedInputs?: Modality[];
  expectedOutputs?: Modality[];
}

export interface SessionConfig {
  initialPrompts?: Message[];
  temperature?: number;
  topK?: number;
  outputLanguage?: string;
  expectedInputs?: Modality[];
  expectedOutputs?: Modality[];
}

export type Role = "system" | "user" | "assistant";

// Definitions for input sources based on documentation
export type ChromeImageBitmapSource =
  | Blob
  | ImageData
  | ImageBitmap
  | VideoFrame
  | OffscreenCanvas
  | HTMLImageElement
  | SVGImageElement
  | HTMLCanvasElement
  | HTMLVideoElement;
export type ChromeAudioBufferSource = Blob | AudioBuffer | BufferSource;

export type ContentElement =
  | { type: "text"; value: string } // Text content must use 'value' property in multimodal arrays
  | { type: "image"; value: ChromeImageBitmapSource | BufferSource } // Image input sources
  | { type: "audio"; value: ChromeAudioBufferSource }; // Audio input sources

export interface Message {
  /**
   * The role of the speaker. Must be 'system' for the 0th initial prompt.
   */
  role: Role;

  /**
   * Content can be a simple string (text-only) or an array of ContentElement for multimodal inputs.
   */
  content: string | ContentElement[];

  /**
   * Optional. Used only on the trailing 'assistant' role message to prefill output.
   * If used on any other message, it throws a "SyntaxError" DOMException.
   */
  prefix?: boolean;
}

export interface Modality {
  type: "text" | "image" | "audio";
  languages: string[];
}

/**
 * The input accepted by prompt(), promptStreaming(), and measureInputUsage().
 * Can be a simple text string (assuming role: 'user') or an array of messages.
 */
export type PromptInput = string | Message[];

/**
 * JSON Schema constraints for structured output.
 * (Simplified here as object; sources confirm it must be a valid JSON Schema object).
 */
export type JsonSchema = object;

/**
 * Options accepted by prompt() and promptStreaming().
 */
export interface PromptOptions {
  /**
   * AbortSignal to stop the ongoing prompt execution.
   */
  signal?: AbortSignal;

  /**
   * Constraint to enforce structured output (JSON Schema object or RegExp).
   */
  responseConstraint?: JsonSchema | RegExp;

  /**
   * If true, omits the response constraint from the input quota count.
   */
  omitResponseConstraintInput?: boolean;
}

/**
 * Options accepted by clone().
 */
export interface CloneOptions {
  /**
   * AbortSignal to abort the cloning process.
   */
  signal?: AbortSignal;
}

export interface LanguageModelSession {
  // --- Properties (Read-Only) ---

  /**
   * The maximum number of tokens this session can process (context window limit).
   */
  readonly inputQuota: number;

  /**
   * The current number of tokens used by the conversation history.
   */
  readonly inputUsage: number;

  // --- Methods ---

  /**
   * Sends a prompt to the model and waits for the entire string response.
   * The promise rejects if the session is destroyed or the prompt is aborted.
   *
   * @param input The prompt text or message history array.
   * @param options Optional constraints or signals.
   * @returns A Promise resolving to the complete response string.
   */
  prompt(input: PromptInput, options?: PromptOptions): Promise<string>;

  /**
   * Sends a prompt to the model and returns a stream for partial results.
   * The ReadableStream errors if the session is destroyed or the prompt is aborted.
   *
   * @param input The prompt text or message history array.
   * @param options Optional constraints or signals.
   * @returns A ReadableStream yielding string chunks.
   */
  promptStreaming(
    input: PromptInput,
    options?: PromptOptions
  ): ReadableStream<string>;

  /**
   * Appends messages to the session context without prompting for a response,
   * allowing the model to process context ahead of time.
   * The input must be an array of messages.
   *
   * @param messages An array of Message objects to append.
   * @param options Optional object containing an AbortSignal to cancel the append operation.
   * @returns A Promise that fulfills once validation and appending are complete.
   */
  append(
    messages: Message[],
    options?: { signal?: AbortSignal }
  ): Promise<void>;

  /**
   * Creates a deep copy of the current session, inheriting parameters (like topK) and interaction history.
   * The cloned session is independent and keeps its own context.
   *
   * @param options Optional object containing an AbortSignal to abort the clone operation.
   * @returns A Promise resolving to a new LanguageModelSession instance.
   */
  clone(options?: CloneOptions): Promise<LanguageModelSession>;

  /**
   * Permanently destroys the session and frees up associated memory resources.
   * Rejects any ongoing calls to prompt() or promptStreaming().
   */
  destroy(): Promise<void>;

  /**
   * Calculates the token usage that a given input would consume without actually processing it.
   *
   * @param input The prompt input (string or message array).
   * @param options Optional object containing an AbortSignal or responseConstraint.
   * @returns A Promise resolving to the calculated token count.
   */
  measureInputUsage(
    input: PromptInput,
    options?: PromptOptions
  ): Promise<number>;

  // --- Events ---

  /**
   * Allows detection of context window overflow, which occurs when old non-system messages are removed
   * to make space for a new prompt.
   */
  addEventListener(event: "quotaoverflow", listener: () => void): void;
}

// For global access, you can still declare it if needed, but now types are exportable
declare global {
  const LanguageModel: LanguageModel;
}
