import { ChatMessage } from "@/store/chat-store";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 group`}
    >
      <div
        className={clsx(`max-w-[90%] px-4 py-2 font-playfair font-normal`, {
          "text-white bg-blue-950 rounded text-xl": isUser,
          "text-gray-900 text-lg my-4": !isUser,
          "border-t border-b": !isUser && message.content.trim() !== "",
        })}
      >
        <div className="text-md break-words">
          {isUser ? (
            // User messages: simple text with whitespace preservation
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            // AI messages: render markdown with custom styling
            <div className="markdown-content">
              <ReactMarkdown
                components={{
                  // Paragraphs
                  p: ({ children }) => (
                    <p className="my-2 leading-relaxed">{children}</p>
                  ),
                  // Headings
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold mt-3 mb-1">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-sm font-semibold mt-2 mb-1">
                      {children}
                    </h4>
                  ),
                  // Lists
                  ul: ({ children }) => (
                    <ul className="my-2 ml-4 list-disc space-y-1">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-2 ml-4 list-decimal space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  // Inline code
                  code: ({ children }) => (
                    <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  ),
                  // Blockquotes
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-gray-300 pl-4 my-2 italic text-gray-700">
                      {children}
                    </blockquote>
                  ),
                  // Links
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-950 hover:text-blue-500 underline"
                    >
                      {children}
                    </a>
                  ),
                  // Strong (bold)
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  // Emphasis (italic)
                  em: ({ children }) => <em className="italic">{children}</em>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {/* <div
          className={`text-[10px] mt-1 ${
            isUser ? "text-purple-200" : "text-gray-500"
          } opacity-0 group-hover:opacity-100 transition-opacity`}
        >
          {message.timestamp.toLocaleTimeString()}
        </div> */}
      </div>
    </div>
  );
}
