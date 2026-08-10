import React from 'react';
import { X, Play, Terminal, PackageCheck, FolderGit2, CheckCircle2, Download } from 'lucide-react';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadZip: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({
  isOpen,
  onClose,
  onDownloadZip
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#252526] p-4 border-b border-[#3c3c3c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-white">
                How to Build & Install in VS Code
              </h2>
              <p className="text-xs text-slate-400">
                Step-by-step instructions to run your multi-repo bookmark extension
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                Download Extension Source Code
              </h3>
              <p className="text-slate-300">
                Click the <strong>Export .ZIP</strong> button below to download the complete extension source project directory.
              </p>
              <button
                onClick={onDownloadZip}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-500 mt-1"
              >
                <Download className="w-3.5 h-3.5" />
                Download Project ZIP Now
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                Unzip & Test in VS Code Extension Host
              </h3>
              <p className="text-slate-300">
                Extract the zip, open the folder in VS Code, and press <kbd className="px-1.5 py-0.5 bg-[#2d2d2d] border border-[#444] rounded text-amber-300 font-mono">F5</kbd>.
              </p>

              <div className="bg-[#181818] p-3 rounded-lg border border-[#333] font-mono text-[11px] text-slate-300 space-y-1">
                <div className="text-slate-500"># In terminal inside extension folder:</div>
                <div className="text-emerald-300">npm install</div>
                <div className="text-emerald-300">npm run compile</div>
              </div>
              <p className="text-slate-400 text-[11px]">
                A new VS Code <strong>[Extension Development Host]</strong> window will launch with the <strong>Workspace Bookmarks</strong> sidebar ready!
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                Package into .vsix and Install Permanently
              </h3>
              <p className="text-slate-300">
                To install the extension permanently into your everyday VS Code editor, package it using <code className="text-amber-300 font-mono">vsce</code>:
              </p>

              <div className="bg-[#181818] p-3 rounded-lg border border-[#333] font-mono text-[11px] text-slate-300 space-y-1">
                <div className="text-slate-500"># Install vsce tool if not already installed:</div>
                <div className="text-emerald-300">npm install -g @vscode/vsce</div>
                <div className="text-slate-500"># Package extension:</div>
                <div className="text-emerald-300">npx vsce package</div>
                <div className="text-slate-500"># Install generated .vsix file into VS Code:</div>
                <div className="text-emerald-300">code --install-extension multirepo-workspace-bookmarks-1.0.0.vsix</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#252526] p-4 border-t border-[#3c3c3c] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md transition-colors text-xs"
          >
            Got it, Let's Build!
          </button>
        </div>
      </div>
    </div>
  );
};
