import React, { useState } from 'react';
import JSZip from 'jszip';
import { SAMPLE_WORKSPACES } from './data/sampleWorkspaces';
import { INITIAL_EXTENSION_FILES } from './data/generatedExtensionCode';
import { 
  SortMode, 
  Bookmark, 
  CustomFolder, 
  WorkspaceFile, 
  WorkspaceTemplate, 
  GeneratedFile 
} from './types';

import { StudioHeader } from './components/header/StudioHeader';
import { VSCodeLayout } from './components/vscode/VSCodeLayout';
import { CodeGeneratorModal } from './components/extensionGenerator/CodeGeneratorModal';
import { SetupGuideModal } from './components/guide/SetupGuideModal';
import { AddFolderModal, EditBookmarkModal } from './components/vscode/Modals';

export default function App() {
  const [currentTemplate, setCurrentTemplate] = useState<WorkspaceTemplate>(SAMPLE_WORKSPACES[0]);
  const [sortMode, setSortMode] = useState<SortMode>('by-repo');
  
  // Workspace bookmarks & folders
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(SAMPLE_WORKSPACES[0].bookmarks);
  const [folders, setFolders] = useState<CustomFolder[]>(SAMPLE_WORKSPACES[0].folders);

  // Editor Tabs & Active File
  const initialOpenFiles = SAMPLE_WORKSPACES[0].repos.flatMap(r => r.files);
  const [openFiles, setOpenFiles] = useState<WorkspaceFile[]>(initialOpenFiles);
  const [activeFile, setActiveFile] = useState<WorkspaceFile | null>(initialOpenFiles[0] || null);
  const [activeBookmark, setActiveBookmark] = useState<Bookmark | null>(bookmarks[0] || null);

  // App Views & Modals
  const [activeTab, setActiveTab] = useState<'simulator' | 'code-generator'>('simulator');
  const [extensionFiles, setExtensionFiles] = useState<GeneratedFile[]>(INITIAL_EXTENSION_FILES);

  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Switch Workspace Preset Template
  const handleSelectTemplate = (template: WorkspaceTemplate) => {
    setCurrentTemplate(template);
    setBookmarks(template.bookmarks);
    setFolders(template.folders);
    const newFiles = template.repos.flatMap(r => r.files);
    setOpenFiles(newFiles);
    setActiveFile(newFiles[0] || null);
    setActiveBookmark(template.bookmarks[0] || null);
  };

  // Bookmark Select
  const handleSelectBookmark = (bookmark: Bookmark) => {
    setActiveBookmark(bookmark);
    // Find target file in repos
    for (const repo of currentTemplate.repos) {
      const foundFile = repo.files.find(f => f.id === bookmark.fileId || f.relativePath === bookmark.relativePath);
      if (foundFile) {
        if (!openFiles.some(f => f.id === foundFile.id)) {
          setOpenFiles(prev => [...prev, foundFile]);
        }
        setActiveFile(foundFile);
        break;
      }
    }
  };

  // Add line bookmark
  const handleAddBookmarkAtLine = (file: WorkspaceFile, lineNumber: number, lineContent: string) => {
    // Check if line bookmark already exists
    const existingIndex = bookmarks.findIndex(b => b.fileId === file.id && b.lineNumber === lineNumber);

    if (existingIndex >= 0) {
      // Toggle off
      const updated = bookmarks.filter((_, idx) => idx !== existingIndex);
      setBookmarks(updated);
    } else {
      // Add new
      const repo = currentTemplate.repos.find(r => r.id === file.repoId);
      const newBookmark: Bookmark = {
        id: `bm_${Date.now()}`,
        fileId: file.id,
        repoId: file.repoId,
        repoName: file.repoName,
        relativePath: file.relativePath,
        fileName: file.relativePath.split('/').pop() || file.relativePath,
        lineNumber,
        lineContent,
        title: `Line ${lineNumber} in ${file.relativePath.split('/').pop()}`,
        tag: 'default',
        createdAt: Date.now()
      };
      setBookmarks(prev => [newBookmark, ...prev]);
      setActiveBookmark(newBookmark);
    }
  };

  // Add file bookmark
  const handleAddBookmarkFile = (file: WorkspaceFile) => {
    const existing = bookmarks.find(b => b.fileId === file.id && !b.lineNumber);
    if (!existing) {
      const newBookmark: Bookmark = {
        id: `bm_${Date.now()}`,
        fileId: file.id,
        repoId: file.repoId,
        repoName: file.repoName,
        relativePath: file.relativePath,
        fileName: file.relativePath.split('/').pop() || file.relativePath,
        title: file.relativePath.split('/').pop(),
        tag: 'default',
        createdAt: Date.now()
      };
      setBookmarks(prev => [newBookmark, ...prev]);
      setActiveBookmark(newBookmark);
    }
  };

  // Remove Bookmark
  const handleRemoveBookmark = (bookmarkId: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    if (activeBookmark?.id === bookmarkId) {
      setActiveBookmark(null);
    }
  };

  // Edit Bookmark Save
  const handleSaveBookmark = (updated: Bookmark) => {
    setBookmarks(prev => prev.map(b => b.id === updated.id ? updated : b));
    if (activeBookmark?.id === updated.id) {
      setActiveBookmark(updated);
    }
  };

  // Create Folder
  const handleCreateFolder = (name: string, parentId?: string) => {
    const newFolder: CustomFolder = {
      id: `folder_${Date.now()}`,
      name,
      parentId: parentId || null
    };
    setFolders(prev => [...prev, newFolder]);
  };

  // Open file from Explorer
  const handleOpenFile = (file: WorkspaceFile) => {
    if (!openFiles.some(f => f.id === file.id)) {
      setOpenFiles(prev => [...prev, file]);
    }
    setActiveFile(file);
  };

  // Close tab
  const handleCloseTab = (fileId: string) => {
    const remaining = openFiles.filter(f => f.id !== fileId);
    setOpenFiles(remaining);
    if (activeFile?.id === fileId) {
      setActiveFile(remaining[remaining.length - 1] || null);
    }
  };

  // ZIP Download Generator
  const handleDownloadZip = async () => {
    const zip = new JSZip();
    for (const file of extensionFiles) {
      zip.file(file.path, file.content);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'multirepo-workspace-bookmarks-vscode-extension.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Studio Header */}
      <StudioHeader
        currentTemplate={currentTemplate}
        templates={SAMPLE_WORKSPACES}
        onSelectTemplate={handleSelectTemplate}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenGuide={() => setIsGuideOpen(true)}
        onDownloadZip={handleDownloadZip}
        totalBookmarksCount={bookmarks.length}
      />

      {/* Main Container View Area */}
      <main className="flex-1 overflow-hidden p-3 flex flex-col">
        {activeTab === 'simulator' ? (
          <VSCodeLayout
            sortMode={sortMode}
            setSortMode={setSortMode}
            bookmarks={bookmarks}
            folders={folders}
            repos={currentTemplate.repos}
            activeBookmark={activeBookmark}
            onSelectBookmark={handleSelectBookmark}
            onRemoveBookmark={handleRemoveBookmark}
            onOpenAddFolder={() => setIsAddFolderOpen(true)}
            onOpenEditBookmark={(bm) => setEditingBookmark(bm)}
            onOpenAddBookmark={() => activeFile && handleAddBookmarkFile(activeFile)}
            openFiles={openFiles}
            activeFile={activeFile}
            onSelectTab={(file) => setActiveFile(file)}
            onCloseTab={handleCloseTab}
            onOpenFile={handleOpenFile}
            onAddBookmarkAtLine={handleAddBookmarkAtLine}
            onAddBookmarkFile={handleAddBookmarkFile}
            workspaceName={currentTemplate.name}
          />
        ) : (
          <CodeGeneratorModal
            files={extensionFiles}
            onUpdateFiles={(newFiles) => setExtensionFiles(newFiles)}
            onDownloadZip={handleDownloadZip}
          />
        )}
      </main>

      {/* Modals */}
      <AddFolderModal
        isOpen={isAddFolderOpen}
        onClose={() => setIsAddFolderOpen(false)}
        onCreateFolder={handleCreateFolder}
        folders={folders}
      />

      <EditBookmarkModal
        isOpen={!!editingBookmark}
        bookmark={editingBookmark}
        onClose={() => setEditingBookmark(null)}
        onSaveBookmark={handleSaveBookmark}
        folders={folders}
      />

      <SetupGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onDownloadZip={handleDownloadZip}
      />
    </div>
  );
}
