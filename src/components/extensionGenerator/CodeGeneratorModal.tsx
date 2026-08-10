import React, { useState } from 'react';
import { GeneratedFile } from '../../types';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Loader2, 
  FolderGit2, 
  Terminal, 
  PackageCheck,
  Code,
  FileJson,
  FileText
} from 'lucide-react';

interface CodeGeneratorModalProps {
  files: GeneratedFile[];
  onUpdateFiles: (newFiles: GeneratedFile[]) => void;
  onDownloadZip: () => void;
}

export const CodeGeneratorModal: React.FC<CodeGeneratorModalProps> = ({
  files,
  onUpdateFiles,
  onDownloadZip
}) => {
  const [activeFilePath, setActiveFilePath] = useState<string>(files[0]?.path || 'src/extension.ts');
  const [copied, setCopied] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);

  const activeFile = files.find(f => f.path === activeFilePath) || files[0];

  const handleCopyCode = () => {
    if (activeFile) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCustomAiFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setAiStatusMessage('Asking AI to update VS Code extension source code...');

    try {
      const response = await fetch('/api/customize-extension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featurePrompt: customPrompt,
          existingFiles: files
        })
      });

      const data = await response.json();

      if (data.success && data.updatedFiles && data.updatedFiles.length > 0) {
        // Merge or replace files
        const updatedMap = new Map(files.map(f => [f.path, f]));
        for (const newFile of data.updatedFiles) {
          updatedMap.set(newFile.path, newFile);
        }
        onUpdateFiles(Array.from(updatedMap.values()));
        setAiStatusMessage(`✨ Feature added: ${data.summary}`);
        setCustomPrompt('');
      } else {
        setAiStatusMessage(`⚠️ ${data.error || 'Failed to update code.'}`);
      }
    } catch (err: any) {
      setAiStatusMessage(`⚠️ Network error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const getFileIcon = (path: string) => {
    if (path.endsWith('.json')) return <FileJson className="w-4 h-4 text-amber-400" />;
    if (path.endsWith('.md')) return <FileText className="w-4 h-4 text-blue-400" />;
    return <FileCode className="w-4 h-4 text-purple-400" />;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#181818] text-slate-200 overflow-hidden select-none">
      {/* Top Banner */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">
              Generated VS Code Extension Source Code
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete production TypeScript extension with TreeDataProvider, Multi-Repo grouping, & Commands.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied File!' : 'Copy Active File'}
          </button>

          <button
            onClick={onDownloadZip}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            Download Extension .ZIP
          </button>
        </div>
      </div>

      {/* AI Customizer Input Bar */}
      <div className="bg-slate-950/80 border-b border-slate-800 p-3">
        <form onSubmit={handleCustomAiFeature} className="flex items-center gap-2 max-w-4xl">
          <div className="relative flex-1">
            <Sparkles className="w-4 h-4 absolute left-3 top-2.5 text-purple-400" />
            <input
              type="text"
              placeholder="Ask AI to customize extension code (e.g. 'Add statusbar item showing bookmark count', 'Add hotkey Ctrl+Alt+B')..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={isGenerating}
              className="w-full bg-slate-900 text-xs text-white pl-9 pr-3 py-2 rounded-md border border-slate-700 focus:outline-none focus:border-purple-500 placeholder-slate-500"
            />
          </div>
          <button
            type="submit"
            disabled={!customPrompt.trim() || isGenerating}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50 shrink-0"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Updating Code...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                Customize Extension
              </>
            )}
          </button>
        </form>

        {aiStatusMessage && (
          <div className="mt-2 text-xs text-purple-300 font-mono bg-purple-950/60 p-2 rounded border border-purple-900/50">
            {aiStatusMessage}
          </div>
        )}
      </div>

      {/* Main File Explorer & Code Viewer Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Extension File Tree */}
        <div className="w-64 bg-[#1e1e1e] border-r border-[#2b2b2b] flex flex-col p-2 space-y-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
            Extension Project Files
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5">
            {files.map(file => {
              const isActive = file.path === activeFilePath;
              return (
                <button
                  key={file.path}
                  onClick={() => setActiveFilePath(file.path)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-mono transition-colors text-left ${
                    isActive
                      ? 'bg-purple-950/60 text-white font-medium border border-purple-800/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#252526]'
                  }`}
                >
                  {getFileIcon(file.path)}
                  <span className="truncate">{file.path}</span>
                </button>
              );
            })}
          </div>

          <div className="p-2 bg-[#252526] rounded border border-[#333] text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-200 flex items-center gap-1">
              <Terminal className="w-3 h-3 text-emerald-400" />
              Build Commands
            </div>
            <p className="font-mono text-[10px] text-emerald-300 bg-[#1e1e1e] p-1.5 rounded">
              npm install<br />
              npm run compile<br />
              npx vsce package
            </p>
          </div>
        </div>

        {/* Right Code Display Viewer */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
          {/* Active File Header */}
          <div className="bg-[#252526] px-4 py-2 border-b border-[#2b2b2b] flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs text-white">
              {getFileIcon(activeFile.path)}
              <span>{activeFile.path}</span>
            </div>
            <span className="text-xs text-slate-400 italic">
              {activeFile.description}
            </span>
          </div>

          {/* Code Body */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-200 bg-[#1e1e1e]">
            <pre className="whitespace-pre">
              <code>{activeFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
