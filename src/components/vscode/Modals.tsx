import React, { useState } from 'react';
import { Bookmark, CustomFolder, Repository, WorkspaceFile } from '../../types';
import { X, FolderPlus, Edit3, Bookmark as BookmarkIcon, Plus } from 'lucide-react';

interface AddFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (name: string, parentId?: string) => void;
  folders: CustomFolder[];
}

export const AddFolderModal: React.FC<AddFolderModalProps> = ({
  isOpen,
  onClose,
  onCreateFolder,
  folders
}) => {
  const [folderName, setFolderName] = useState('');
  const [parentId, setParentId] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    onCreateFolder(folderName.trim(), parentId || undefined);
    setFolderName('');
    setParentId('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#252526] border border-[#3c3c3c] rounded-xl shadow-2xl w-full max-w-md p-5 text-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-[#3c3c3c]">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-sm text-white">Create Custom Folder</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Folder Name (e.g., 🔥 Sprint 44, 💳 Payment Logic)
            </label>
            <input
              type="text"
              autoFocus
              placeholder="Enter folder title..."
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Parent Folder (Optional Nesting)
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">None (Root Level Folder)</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#3c3c3c]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!folderName.trim()}
              className="px-4 py-1.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditBookmarkModalProps {
  isOpen: boolean;
  bookmark: Bookmark | null;
  onClose: () => void;
  onSaveBookmark: (updated: Bookmark) => void;
  folders: CustomFolder[];
}

export const EditBookmarkModal: React.FC<EditBookmarkModalProps> = ({
  isOpen,
  bookmark,
  onClose,
  onSaveBookmark,
  folders
}) => {
  if (!isOpen || !bookmark) return null;

  const [title, setTitle] = useState(bookmark.title || '');
  const [notes, setNotes] = useState(bookmark.notes || '');
  const [folderId, setFolderId] = useState<string>(bookmark.folderId || '');
  const [tag, setTag] = useState<Bookmark['tag']>(bookmark.tag || 'default');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveBookmark({
      ...bookmark,
      title: title.trim() || undefined,
      notes: notes.trim() || undefined,
      folderId: folderId || null,
      tag
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#252526] border border-[#3c3c3c] rounded-xl shadow-2xl w-full max-w-md p-5 text-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-[#3c3c3c]">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-sm text-white">Edit Bookmark Details</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Target File</label>
            <div className="font-mono text-slate-200 bg-[#1e1e1e] p-2 rounded border border-[#333]">
              [{bookmark.repoName}] {bookmark.relativePath}
              {bookmark.lineNumber && ` (Line ${bookmark.lineNumber})`}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Bookmark Alias / Display Title</label>
            <input
              type="text"
              placeholder="e.g., Stripe Payment Charge Handler"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Assign to Custom Folder</label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Unassigned (No Folder)</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Priority Badge Tag</label>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value as any)}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="default">Default (None)</option>
              <option value="urgent">🔥 Urgent</option>
              <option value="feature">✨ Feature</option>
              <option value="bug">🐛 Bug</option>
              <option value="review">🔍 Review</option>
              <option value="refactor">🛠️ Refactor</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Developer Notes</label>
            <textarea
              rows={3}
              placeholder="Add developer notes or context why this file is bookmarked..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#3c3c3c]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
