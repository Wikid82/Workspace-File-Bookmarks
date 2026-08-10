import React, { useState } from 'react';
import { 
  SortMode, 
  Bookmark, 
  CustomFolder, 
  Repository, 
  WorkspaceFile 
} from '../../types';
import { 
  FolderGit2, 
  Folder, 
  FolderPlus, 
  Bookmark as BookmarkIcon, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  ChevronDown, 
  Tag, 
  Pin, 
  FileCode2, 
  FolderTree, 
  ListFilter,
  Plus
} from 'lucide-react';

interface BookmarkTreePanelProps {
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  bookmarks: Bookmark[];
  folders: CustomFolder[];
  repos: Repository[];
  activeBookmarkId: string | null;
  onSelectBookmark: (bookmark: Bookmark) => void;
  onRemoveBookmark: (bookmarkId: string) => void;
  onOpenAddFolder: () => void;
  onOpenEditBookmark: (bookmark: Bookmark) => void;
  onOpenAddBookmark: () => void;
}

export const BookmarkTreePanel: React.FC<BookmarkTreePanelProps> = ({
  sortMode,
  setSortMode,
  bookmarks,
  folders,
  repos,
  activeBookmarkId,
  onSelectBookmark,
  onRemoveBookmark,
  onOpenAddFolder,
  onOpenEditBookmark,
  onOpenAddBookmark
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [expandedRepos, setExpandedRepos] = useState<Record<string, boolean>>({
    'repo-web': true,
    'repo-payment': true,
    'repo-order': true,
    'repo-infra': true
  });
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'f-sprint-auth': true,
    'f-payment-gateway': true,
    'f-infra': true
  });

  const toggleRepo = (repoId: string) => {
    setExpandedRepos(prev => ({ ...prev, [repoId]: !prev[repoId] }));
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  // Filtered bookmarks
  const filteredBookmarks = bookmarks.filter(b => {
    const matchesSearch = 
      b.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.relativePath.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.repoName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.title && b.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.notes && b.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = selectedTagFilter === 'all' || b.tag === selectedTagFilter;

    return matchesSearch && matchesTag;
  });

  // Helper tag colors
  const getTagBadge = (tag?: string) => {
    switch (tag) {
      case 'urgent': return <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded">Urgent</span>;
      case 'feature': return <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">Feature</span>;
      case 'bug': return <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">Bug</span>;
      case 'review': return <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded">Review</span>;
      case 'refactor': return <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">Refactor</span>;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-r border-[#2b2b2b] text-slate-300 w-full select-none">
      {/* Header Title & Actions */}
      <div className="p-2.5 border-b border-[#2b2b2b] flex items-center justify-between bg-[#252526]">
        <div className="flex items-center gap-1.5">
          <BookmarkIcon className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-slate-200 tracking-wide uppercase">
            Workspace Bookmarks
          </span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 font-mono rounded-full border border-blue-500/30">
            {filteredBookmarks.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenAddBookmark}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Bookmark Active File"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenAddFolder}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Create Custom Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grouping Mode Switcher Toolbar */}
      <div className="p-2 bg-[#181818] border-b border-[#2b2b2b] flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-1 bg-[#252526] p-0.5 rounded border border-[#333]">
          <button
            onClick={() => setSortMode('by-repo')}
            className={`flex items-center justify-center gap-1 py-1 rounded text-[11px] font-medium transition-all ${
              sortMode === 'by-repo'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#2a2d2e]'
            }`}
            title="Sort and group bookmarks by Repository"
          >
            <FolderGit2 className="w-3 h-3" />
            <span>By Repo</span>
          </button>

          <button
            onClick={() => setSortMode('custom-folders')}
            className={`flex items-center justify-center gap-1 py-1 rounded text-[11px] font-medium transition-all ${
              sortMode === 'custom-folders'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#2a2d2e]'
            }`}
            title="Organize with custom nested folders"
          >
            <FolderTree className="w-3 h-3" />
            <span>Folders</span>
          </button>

          <button
            onClick={() => setSortMode('flat-list')}
            className={`flex items-center justify-center gap-1 py-1 rounded text-[11px] font-medium transition-all ${
              sortMode === 'flat-list'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#2a2d2e]'
            }`}
            title="Show flat list of all bookmarks"
          >
            <ListFilter className="w-3 h-3" />
            <span>Flat List</span>
          </button>
        </div>

        {/* Search & Tag Filter Bar */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
            <input
              type="text"
              placeholder="Search bookmarks or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#252526] text-xs text-slate-200 pl-7 pr-2 py-1 rounded border border-[#3c3c3c] focus:outline-none focus:border-blue-500 placeholder-slate-500"
            />
          </div>

          <select
            value={selectedTagFilter}
            onChange={(e) => setSelectedTagFilter(e.target.value)}
            className="bg-[#252526] text-[11px] text-slate-300 px-1.5 py-1 rounded border border-[#3c3c3c] focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">Tags: All</option>
            <option value="urgent">🔥 Urgent</option>
            <option value="feature">✨ Feature</option>
            <option value="bug">🐛 Bug</option>
            <option value="review">🔍 Review</option>
            <option value="refactor">🛠️ Refactor</option>
          </select>
        </div>
      </div>

      {/* Main Tree List View Area */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1 text-xs">
        {filteredBookmarks.length === 0 ? (
          <div className="text-center py-8 px-4 text-slate-500">
            <BookmarkIcon className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="text-xs font-medium text-slate-400">No matching bookmarks</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Add a bookmark from the file editor or adjust your filter.
            </p>
          </div>
        ) : sortMode === 'by-repo' ? (
          /* MODE 1: GROUPED BY REPOSITORY */
          repos.map(repo => {
            const repoBookmarks = filteredBookmarks.filter(b => b.repoId === repo.id);
            if (repoBookmarks.length === 0 && searchQuery) return null;

            const isExpanded = expandedRepos[repo.id] ?? true;

            return (
              <div key={repo.id} className="mb-2">
                {/* Repo Header Node */}
                <div
                  onClick={() => toggleRepo(repo.id)}
                  className="flex items-center justify-between p-1.5 rounded hover:bg-[#2a2d2e] cursor-pointer group text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <FolderGit2 className="w-3.5 h-3.5 shrink-0" style={{ color: repo.color }} />
                    <span className="font-semibold text-slate-200 truncate">
                      {repo.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#2d2d2d] text-slate-400 border border-[#333]">
                    {repoBookmarks.length}
                  </span>
                </div>

                {/* Repo File Bookmarks Children */}
                {isExpanded && (
                  <div className="ml-3.5 pl-2 border-l border-[#2e2e2e] space-y-1 mt-1">
                    {repoBookmarks.length === 0 ? (
                      <div className="text-[11px] text-slate-500 italic py-1 px-2">
                        No bookmarked files in this repo yet.
                      </div>
                    ) : (
                      repoBookmarks.map(bm => (
                        <BookmarkItemNode
                          key={bm.id}
                          bookmark={bm}
                          isActive={bm.id === activeBookmarkId}
                          onSelect={() => onSelectBookmark(bm)}
                          onEdit={() => onOpenEditBookmark(bm)}
                          onRemove={() => onRemoveBookmark(bm.id)}
                          getTagBadge={getTagBadge}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : sortMode === 'custom-folders' ? (
          /* MODE 2: CUSTOM FOLDER HIERARCHY */
          <div>
            {/* Custom Folders Render */}
            {folders.map(folder => {
              const folderBookmarks = filteredBookmarks.filter(b => b.folderId === folder.id);
              const isExpanded = expandedFolders[folder.id] ?? true;

              return (
                <div key={folder.id} className="mb-2">
                  <div
                    onClick={() => toggleFolder(folder.id)}
                    className="flex items-center justify-between p-1.5 rounded hover:bg-[#2a2d2e] cursor-pointer text-slate-200 transition-colors bg-[#252526]/40 border border-[#2b2b2b]"
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-semibold text-slate-200 truncate">
                        {folder.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#333] text-amber-300">
                      {folderBookmarks.length}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="ml-3.5 pl-2 border-l border-[#333] space-y-1 mt-1">
                      {folderBookmarks.length === 0 ? (
                        <div className="text-[11px] text-slate-500 italic py-1 px-2">
                          Folder is empty. Edit a bookmark to assign here.
                        </div>
                      ) : (
                        folderBookmarks.map(bm => (
                          <BookmarkItemNode
                            key={bm.id}
                            bookmark={bm}
                            showRepoBadge
                            isActive={bm.id === activeBookmarkId}
                            onSelect={() => onSelectBookmark(bm)}
                            onEdit={() => onOpenEditBookmark(bm)}
                            onRemove={() => onRemoveBookmark(bm.id)}
                            getTagBadge={getTagBadge}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unassigned Folders Section */}
            {(() => {
              const unassigned = filteredBookmarks.filter(b => !b.folderId);
              if (unassigned.length === 0) return null;
              return (
                <div className="mt-3 pt-2 border-t border-[#2a2a2a]">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">
                    Unassigned Bookmarks ({unassigned.length})
                  </div>
                  <div className="space-y-1">
                    {unassigned.map(bm => (
                      <BookmarkItemNode
                        key={bm.id}
                        bookmark={bm}
                        showRepoBadge
                        isActive={bm.id === activeBookmarkId}
                        onSelect={() => onSelectBookmark(bm)}
                        onEdit={() => onOpenEditBookmark(bm)}
                        onRemove={() => onRemoveBookmark(bm.id)}
                        getTagBadge={getTagBadge}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* MODE 3: FLAT LIST */
          <div className="space-y-1">
            {filteredBookmarks.map(bm => (
              <BookmarkItemNode
                key={bm.id}
                bookmark={bm}
                showRepoBadge
                isActive={bm.id === activeBookmarkId}
                onSelect={() => onSelectBookmark(bm)}
                onEdit={() => onOpenEditBookmark(bm)}
                onRemove={() => onRemoveBookmark(bm.id)}
                getTagBadge={getTagBadge}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface BookmarkItemNodeProps {
  bookmark: Bookmark;
  showRepoBadge?: boolean;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onRemove: () => void;
  getTagBadge: (tag?: string) => React.ReactNode;
}

const BookmarkItemNode: React.FC<BookmarkItemNodeProps> = ({
  bookmark,
  showRepoBadge,
  isActive,
  onSelect,
  onEdit,
  onRemove,
  getTagBadge
}) => {
  return (
    <div
      onClick={onSelect}
      className={`p-2 rounded border transition-all cursor-pointer group flex flex-col gap-1 ${
        isActive
          ? 'bg-blue-900/30 border-blue-500/50 text-white shadow-sm'
          : 'bg-[#252526] hover:bg-[#2a2d2e] border-[#2d2d2d] text-slate-300'
      }`}
    >
      {/* Top Line: File Name & Line number */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <FileCode2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="font-medium text-slate-100 text-xs truncate">
            {bookmark.title || bookmark.fileName}
          </span>
          {bookmark.lineNumber && (
            <span className="text-[10px] font-mono px-1 py-0.1 bg-[#1e1e1e] text-blue-300 rounded border border-blue-900/50 shrink-0">
              :{bookmark.lineNumber}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/80"
            title="Edit Bookmark Details"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-700/80"
            title="Remove Bookmark"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Path & Repo Pill */}
      <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400">
        <span className="font-mono truncate text-slate-400" title={bookmark.relativePath}>
          {bookmark.relativePath}
        </span>
        {showRepoBadge && (
          <span className="shrink-0 font-mono px-1.5 py-0.2 text-[9px] bg-slate-800 text-slate-300 rounded border border-slate-700">
            [{bookmark.repoName}]
          </span>
        )}
      </div>

      {/* Optional Line Content / Notes Preview */}
      {(bookmark.lineContent || bookmark.notes) && (
        <div className="mt-0.5 pt-1 border-t border-[#2e2e2e] flex flex-col gap-0.5">
          {bookmark.lineContent && (
            <div className="font-mono text-[10px] text-slate-400 bg-[#1e1e1e] px-1.5 py-0.5 rounded truncate">
              {bookmark.lineContent}
            </div>
          )}
          {bookmark.notes && (
            <div className="text-[10px] text-amber-300/90 italic truncate flex items-center gap-1">
              <span>📝 {bookmark.notes}</span>
            </div>
          )}
        </div>
      )}

      {/* Tag Badge */}
      {bookmark.tag && bookmark.tag !== 'default' && (
        <div className="mt-0.5">
          {getTagBadge(bookmark.tag)}
        </div>
      )}
    </div>
  );
};
