import React from 'react';
import { WorkspaceFile, Bookmark, Repository } from '../../types';
import { 
  FileCode2, 
  X, 
  Bookmark as BookmarkIcon, 
  Pin, 
  FolderGit2, 
  Check, 
  Sparkles,
  MessageSquare
} from 'lucide-react';

interface VSCodeEditorProps {
  openFiles: WorkspaceFile[];
  activeFile: WorkspaceFile | null;
  onSelectTab: (file: WorkspaceFile) => void;
  onCloseTab: (fileId: string) => void;
  bookmarks: Bookmark[];
  onAddBookmarkAtLine: (file: WorkspaceFile, lineNumber: number, lineContent: string) => void;
  onAddBookmarkFile: (file: WorkspaceFile) => void;
  repos: Repository[];
}

export const VSCodeEditor: React.FC<VSCodeEditorProps> = ({
  openFiles,
  activeFile,
  onSelectTab,
  onCloseTab,
  bookmarks,
  onAddBookmarkAtLine,
  onAddBookmarkFile,
  repos
}) => {
  if (!activeFile) {
    return (
      <div className="flex-1 bg-[#1e1e1e] flex flex-col items-center justify-center text-slate-500 p-8 select-none">
        <FileCode2 className="w-16 h-16 mb-4 opacity-20 text-slate-400" />
        <p className="text-sm font-medium text-slate-400">No File Open</p>
        <p className="text-xs text-slate-500 mt-1">
          Select a file from the explorer or click a bookmark from the sidebar to open code.
        </p>
      </div>
    );
  }

  const repo = repos.find(r => r.id === activeFile.repoId);
  const lines = activeFile.content.split('\n');

  // Find bookmarks for this active file
  const fileBookmarks = bookmarks.filter(b => b.fileId === activeFile.id || b.relativePath === activeFile.relativePath);
  const isFileBookmarked = fileBookmarks.some(b => !b.lineNumber);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] text-slate-200 overflow-hidden select-none">
      {/* Tab Bar */}
      <div className="flex items-center bg-[#252526] border-b border-[#2b2b2b] overflow-x-auto scrollbar-none">
        {openFiles.map(file => {
          const isActive = activeFile.id === file.id;
          const fileBmCount = bookmarks.filter(b => b.fileId === file.id).length;

          return (
            <div
              key={file.id}
              onClick={() => onSelectTab(file)}
              className={`group flex items-center gap-2 px-3 py-2 text-xs font-mono border-r border-[#2b2b2b] cursor-pointer shrink-0 transition-colors ${
                isActive
                  ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500'
                  : 'bg-[#2d2d2d]/60 text-slate-400 hover:text-slate-200 hover:bg-[#2d2d2d]'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5 text-blue-400" />
              <span>{file.relativePath.split('/').pop()}</span>

              {fileBmCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-blue-500" title={`${fileBmCount} bookmarks in file`} />
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(file.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Breadcrumb & Quick Action Bar */}
      <div className="px-4 py-1.5 bg-[#181818] border-b border-[#2b2b2b] flex items-center justify-between text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2 overflow-hidden">
          {repo && (
            <span
              className="px-1.5 py-0.5 text-[10px] font-semibold rounded border"
              style={{
                backgroundColor: `${repo.color}15`,
                borderColor: `${repo.color}40`,
                color: repo.color
              }}
            >
              <FolderGit2 className="w-3 h-3 inline mr-1" />
              {repo.name}
            </span>
          )}
          <span className="text-slate-300 truncate">{activeFile.relativePath}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddBookmarkFile(activeFile)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-sans font-medium rounded transition-all ${
              isFileBookmarked
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                : 'bg-[#2b2b2b] text-slate-300 hover:bg-[#333] border border-slate-700'
            }`}
          >
            <BookmarkIcon className="w-3.5 h-3.5 text-blue-400" />
            {isFileBookmarked ? 'Bookmarked File' : 'Bookmark File'}
          </button>
        </div>
      </div>

      {/* Code Editor Body */}
      <div className="flex-1 overflow-auto font-mono text-xs leading-relaxed p-2 bg-[#1e1e1e]">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((lineText, idx) => {
              const lineNumber = idx + 1;
              const lineBookmark = fileBookmarks.find(b => b.lineNumber === lineNumber);
              const isBookmarkedLine = !!lineBookmark;

              return (
                <React.Fragment key={lineNumber}>
                  <tr
                    className={`group hover:bg-[#2a2d2e]/80 transition-colors ${
                      isBookmarkedLine ? 'bg-blue-950/30 font-medium' : ''
                    }`}
                  >
                    {/* Line Number & Bookmark Gutter */}
                    <td
                      onClick={() => onAddBookmarkAtLine(activeFile, lineNumber, lineText.trim())}
                      className={`w-12 select-none text-right pr-3 pl-1 py-0.5 cursor-pointer border-r border-[#2b2b2b] transition-colors ${
                        isBookmarkedLine
                          ? 'text-blue-400 font-bold bg-blue-900/40'
                          : 'text-slate-600 group-hover:text-slate-300'
                      }`}
                      title="Click to bookmark or unbookmark this line"
                    >
                      <div className="flex items-center justify-end gap-1">
                        {isBookmarkedLine ? (
                          <BookmarkIcon className="w-3 h-3 text-blue-400 fill-blue-400 shrink-0" />
                        ) : (
                          <span className="opacity-0 group-hover:opacity-100 text-blue-400 text-[10px]">
                            +
                          </span>
                        )}
                        <span>{lineNumber}</span>
                      </div>
                    </td>

                    {/* Code Text */}
                    <td className="pl-4 py-0.5 text-slate-200 whitespace-pre font-mono">
                      {lineText || ' '}
                    </td>
                  </tr>

                  {/* Inline Bookmarked Note Annotation */}
                  {isBookmarkedLine && lineBookmark && (lineBookmark.notes || lineBookmark.title) && (
                    <tr className="bg-blue-950/40 border-y border-blue-800/30">
                      <td className="border-r border-[#2b2b2b]"></td>
                      <td className="pl-4 py-1.5 text-xs font-sans text-blue-200">
                        <div className="flex items-center gap-2 bg-blue-900/40 border border-blue-500/30 p-2 rounded-md max-w-xl">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-semibold text-white text-xs">
                              {lineBookmark.title || `Bookmark at Line ${lineNumber}`}
                            </span>
                            {lineBookmark.notes && (
                              <span className="text-slate-300 text-[11px]">
                                {lineBookmark.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
