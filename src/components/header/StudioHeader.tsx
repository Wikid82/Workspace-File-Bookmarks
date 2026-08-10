import React from 'react';
import { 
  FolderGit2, 
  Code2, 
  PlaySquare, 
  Download, 
  HelpCircle, 
  BookmarkCheck, 
  Layers, 
  Sparkles 
} from 'lucide-react';
import { WorkspaceTemplate } from '../../types';

interface StudioHeaderProps {
  currentTemplate: WorkspaceTemplate;
  templates: WorkspaceTemplate[];
  onSelectTemplate: (template: WorkspaceTemplate) => void;
  activeTab: 'simulator' | 'code-generator';
  setActiveTab: (tab: 'simulator' | 'code-generator') => void;
  onOpenGuide: () => void;
  onDownloadZip: () => void;
  totalBookmarksCount: number;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  currentTemplate,
  templates,
  onSelectTemplate,
  activeTab,
  setActiveTab,
  onOpenGuide,
  onDownloadZip,
  totalBookmarksCount
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md select-none">
      {/* App Branding */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-sm">
          <BookmarkCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-sm tracking-tight text-white">
              VS Code Multi-Repo Bookmarks
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
              Extension Studio
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Multi-Repository Workspace Bookmarking & Extension Generator
          </p>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="flex items-center gap-2 bg-slate-850 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
        <FolderGit2 className="w-4 h-4 text-slate-400 ml-1.5" />
        <span className="text-xs text-slate-400 font-medium">Workspace:</span>
        <select
          value={currentTemplate.id}
          onChange={(e) => {
            const found = templates.find(t => t.id === e.target.value);
            if (found) onSelectTemplate(found);
          }}
          className="bg-slate-900 text-xs font-medium text-slate-200 px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          {templates.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.repos.length} repos)
            </option>
          ))}
        </select>
      </div>

      {/* Tab Mode Switcher */}
      <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === 'simulator'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <PlaySquare className="w-3.5 h-3.5" />
          VS Code Simulator
          <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-slate-900/60 text-slate-300 rounded-full">
            {totalBookmarksCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('code-generator')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === 'code-generator'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-purple-200" />
          Extension Source Code
          <span className="flex items-center gap-0.5 text-[10px] text-purple-300 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800/40">
            <Sparkles className="w-2.5 h-2.5 text-purple-300" /> Ready
          </span>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenGuide}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
          title="VS Code Installation & Testing Guide"
        >
          <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">How to Install</span>
        </button>

        <button
          onClick={onDownloadZip}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-100 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/50 rounded-md transition-all shadow-sm"
          title="Download Extension Source Code (.zip)"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export .ZIP</span>
        </button>
      </div>
    </header>
  );
};
