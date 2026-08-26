import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownMessageProps {
  children: string;
  variant?: "default" | "inverse";
}

export default function MarkdownMessage({
  children,
  variant = "default",
}: MarkdownMessageProps) {
  const subtleText = variant === "inverse" ? "text-white/75" : "text-[#6B7C72]";
  const border = variant === "inverse" ? "border-white/25" : "border-[#E2D9CC]";
  const code = variant === "inverse"
    ? "bg-white/15 text-white"
    : "bg-[#F2ECE4] text-[#0D5C46]";

  return (
    <div className="min-w-0 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          p: ({ children: content }) => (
            <p className="mb-3 whitespace-pre-wrap last:mb-0">{content}</p>
          ),
          strong: ({ children: content }) => (
            <strong className="font-extrabold">{content}</strong>
          ),
          em: ({ children: content }) => <em className="italic">{content}</em>,
          ul: ({ children: content }) => (
            <ul className="mb-3 ml-5 list-disc space-y-1.5 last:mb-0">{content}</ul>
          ),
          ol: ({ children: content }) => (
            <ol className="mb-3 ml-5 list-decimal space-y-1.5 last:mb-0">{content}</ol>
          ),
          li: ({ children: content }) => <li className="pl-0.5">{content}</li>,
          h1: ({ children: content }) => (
            <h1 className="mb-3 text-lg font-extrabold leading-tight">{content}</h1>
          ),
          h2: ({ children: content }) => (
            <h2 className="mb-2.5 text-base font-extrabold leading-tight">{content}</h2>
          ),
          h3: ({ children: content }) => (
            <h3 className="mb-2 text-sm font-extrabold leading-tight">{content}</h3>
          ),
          blockquote: ({ children: content }) => (
            <blockquote className={`mb-3 border-l-2 pl-3 italic ${border} ${subtleText}`}>
              {content}
            </blockquote>
          ),
          a: ({ children: content, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold underline decoration-current/40 underline-offset-2 hover:decoration-current"
            >
              {content}
            </a>
          ),
          code: ({ children: content, className }) => (
            <code className={`${className ?? ""} rounded px-1 py-0.5 font-mono text-[0.9em] ${code}`}>
              {content}
            </code>
          ),
          pre: ({ children: content }) => (
            <pre className={`mb-3 max-w-full overflow-x-auto rounded-xl p-3 text-xs ${code}`}>
              {content}
            </pre>
          ),
          hr: () => <hr className={`my-4 ${border}`} />,
          table: ({ children: content }) => (
            <div className="mb-3 max-w-full overflow-x-auto rounded-lg">
              <table className={`w-full border-collapse text-left text-xs ${border}`}>
                {content}
              </table>
            </div>
          ),
          th: ({ children: content }) => (
            <th className={`border px-2 py-1.5 font-extrabold ${border}`}>{content}</th>
          ),
          td: ({ children: content }) => (
            <td className={`border px-2 py-1.5 align-top ${border}`}>{content}</td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
