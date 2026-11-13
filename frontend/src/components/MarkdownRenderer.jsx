import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

function CodeBlock({ inline, className, children, ...props }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeText = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline || !match && !codeText.includes('\n')) {
    return (
      <code
        className="px-1.5 py-0.5 rounded bg-slate-100 text-indigo-700 font-mono text-xs font-semibold border border-slate-200/80"
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-sm text-xs font-mono">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400">
        <span className="uppercase tracking-wider font-semibold text-indigo-400">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          type="button"
          className="inline-flex items-center gap-1 hover:text-white transition-colors py-0.5 px-1.5 rounded"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-slate-100 leading-relaxed">
        <code>{codeText}</code>
      </pre>
    </div>
  );
}

export default function MarkdownRenderer({ content }) {
  return (
    <div className="markdown-content text-slate-800 text-sm leading-relaxed space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-200">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-slate-900 mt-3.5 mb-2 pb-1 border-b border-slate-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold text-slate-900 mt-3 mb-1.5 text-indigo-950">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-bold text-slate-800 mt-2 mb-1 uppercase tracking-wider">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="my-0.5 leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
          em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
          hr: () => <hr className="border-t border-slate-200 my-4" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-500 bg-indigo-50/60 pl-3.5 py-1.5 my-2 rounded-r text-slate-700 italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 border border-slate-200 rounded-xl shadow-xs">
              <table className="min-w-full text-left text-xs divide-y divide-slate-200">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-slate-50/70 transition-colors">{children}</tr>,
          th: ({ children }) => (
            <th className="px-3.5 py-2 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="px-3.5 py-2 text-slate-700">{children}</td>,
          code: CodeBlock
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
