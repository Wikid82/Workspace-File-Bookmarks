import React, { useState } from 'react';
import { 
  SortMode, 
  Bookmark, 
  CustomFolder, 
  Repository, 
  WorkspaceFile 
} from '../../types';
import { BookmarkTreePanel } from './BookmarkTreePanel';
import { VSCodeExplorer } from './VSCodeExplorer';
import { VSCodeEditor } from './VSCodeEditor';
import { 
  Files, 
  Bookmark as BookmarkIcon, 
  Search, 
  GitBranch, 
  Settings, 
  Maximize2, 
  Minimize2, 
  Info,
  Terminal,
  FolderGit2
} from 'lucide-react';

interface VSCodeLayoutProps {
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  bookmarks: Bookmark[];
  folders: CustomFolder[];
  repos: Repository[];
  activeBookmark: Bookmark | null;
  onSelectBookmark: (bookmark: Bookmark) => void;
  onRemoveBookmark: (bookmarkId: string) => void;
  onOpenAddFolder: () => void;
  onOpenEditBookmark: (bookmark: Bookmark) => void;
  onOpenAddBookmark: () => void;
  openFiles: WorkspaceFile[];
  activeFile: WorkspaceFile | null;
  onSelectTab: (file: WorkspaceFile) => void;
  onCloseTab: (fileId: string) => void;
  onOpenFile: (file: WorkspaceFile) => void;
  onAddBookmarkAtLine: (file: WorkspaceFile, lineNumber: number, lineContent: string) => void;
  onAddBookmarkFile: (file: WorkspaceFile) => void;
  workspaceName: string;
}

export const VSCodeLayout: React.FC<VSCodeLayoutProps> = ({
  sortMode,
  setSortMode,
  bookmarks,
  folders,
  repos,
  activeBookmark,
  onSelectBookmark,
  onRemoveBookmark,
  onOpenAddFolder,
  onOpenEditBookmark,
  onOpenAddBookmark,
  openFiles,
  activeFile,
  onSelectTab,
  onCloseTab,
  onOpenFile,
  onAddBookmarkAtLine,
  onAddBookmarkFile,
  workspaceName
}) => {
  const [activeSidebarTab, setActiveSidebarTab] = useState<'bookmarks' | 'explorer'>('bookmarks');

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] border border-[#2b2b2b] rounded-xl overflow-hidden shadow-2xl select-none">
      {/* VS Code Titlebar */}
      <div className="bg-[#323233] px-3 py-1.5 border-b border-[#252526] flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>
          <span className="text-slate-400 font-mono text-[11px] ml-2">
            [VS Code] {workspaceName} - Multi-Repo Bookmarks Extension Host
          </span>
        </div>

        {/* Center Search / Command Palette bar */}
        <div className="hidden md:flex items-center justify-center gap-2 bg-[#252526] px-6 py-1 rounded-md border border-[#3c3c3c] text-slate-400 text-[11px] font-mono cursor-pointer hover:border-slate-500 transition-colors">
          <Search className="w-3 h-3" />
          <span>{workspaceName} (Multi-Repo Workspace)</span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
            {repos.length} Repos
          </span>
        </div>
      </div>

      {/* Main Workspace Frame (Activity Bar + Sidebar + Editor) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <div className="w-12 bg-[#333333] border-r border-[#2b2b2b] flex flex-col items-center py-3 gap-4 text-slate-400 shrink-0">
          <button
            onClick={() => setActiveSidebarTab('bookmarks')}
            className={`relative p-2 rounded-lg transition-colors ${
              activeSidebarTab === 'bookmarks'
                ? 'text-white bg-blue-600/30 border border-blue-500/50'
                : 'hover:text-white hover:bg-slate-700/50'
            }`}
            title="Multi-Repo Bookmarks Sidebar"
          >
            <BookmarkIcon className="w-5 h-5 text-blue-400" />
            <span className="absolute -top-1 -right-1 px-1 py-0.2 text-[9px] font-bold bg-blue-600 text-white rounded-full">
              {bookmarks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSidebarTab('explorer')}
            className={`p-2 rounded-lg transition-colors ${
              activeSidebarTab === 'explorer'
                ? 'text-white bg-blue-600/30 border border-blue-500/50'
                : 'hover:text-white hover:bg-slate-700/50'
            }`}
            title="Explorer"
          >
            <Files className="w-5 h-5" />
          </button>

          <div className="mt-auto flex flex-col gap-3">
            <button className="p-2 text-slate-500 hover:text-slate-300">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sidebar Panel (Bookmarks vs Explorer) */}
        <div className="w-80 min-w-[260px] max-w-[340px] flex shrink-0">
          {activeSidebarTab === 'bookmarks' ? (
            <BookmarkTreePanel
              sortMode={sortMode}
              setSortMode={setSortMode}
              bookmarks={bookmarks}
              folders={folders}
              repos={repos}
              activeBookmarkId={activeBookmark?.id || null}
              onSelectBookmark={onSelectBookmark}
              onRemoveBookmark={onRemoveBookmark}
              onOpenAddFolder={onOpenAddFolder}
              onOpenEditBookmark={onOpenEditBookmark}
              onOpenAddBookmark={onOpenAddBookmark}
            />
          ) : (
            <VSCodeExplorer
              repos={repos}
              onOpenFile={onOpenFile}
              activeFileId={activeFile?.id}
            />
          )}
        </div>

        {/* Central Editor Area */}
        <VSCodeEditor
          openFiles={openFiles}
          activeFile={activeFile}
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          bookmarks={bookmarks}
          onAddBookmarkAtLine={onAddBookmarkAtLine}
          onAddBookmarkFile={onAddBookmarkFile}
          repos={repos}
        />
      </div>

      {/* VS Code Status Bar */}
      <div className="bg-[#007acc] px-3 py-1 flex items-center justify-between text-[11px] text-white font-mono shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-semibold">
            <GitBranch className="w-3.5 h-3.5" /> main
          </span>
          <span className="flex items-center gap-1">
            <FolderGit2 className="w-3.5 h-3.5" /> {repos.length} Repos Active
          </span>
          <span>Workspace Bookmarks Extension Active</span>
        </div>

        <div className="flex items-center gap-3 text-blue-100">
          <span>UTF-8</span>
          <span>TypeScript / React</span>
          <span className="px-1.5 py-0.2 bg-blue-800 rounded text-[10px]">
            Sort: {sortMode}
          </span>
        </div>
      </div>
    </div>
  );
};
