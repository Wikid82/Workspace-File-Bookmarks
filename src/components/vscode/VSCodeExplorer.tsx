import React, { useState } from 'react';
import { Repository, WorkspaceFile } from '../../types';
import { 
  FolderGit2, 
  FileCode2, 
  ChevronRight, 
  ChevronDown, 
  Folder 
} from 'lucide-react';

interface VSCodeExplorerProps {
  repos: Repository[];
  onOpenFile: (file: WorkspaceFile) => void;
  activeFileId?: string;
}

export const VSCodeExplorer: React.FC<VSCodeExplorerProps> = ({
  repos,
  onOpenFile,
  activeFileId
}) => {
  const [expandedRepos, setExpandedRepos] = useState<Record<string, boolean>>({
    'repo-web': true,
    'repo-payment': true,
    'repo-order': true,
    'repo-infra': true
  });

  const toggleRepo = (repoId: string) => {
    setExpandedRepos(prev => ({ ...prev, [repoId]: !prev[repoId] }));
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-r border-[#2b2b2b] text-slate-300 w-full select-none">
      <div className="p-2.5 border-b border-[#2b2b2b] bg-[#252526]">
        <span className="text-xs font-semibold text-slate-200 tracking-wide uppercase">
          Workspace Explorer ({repos.length} Repos)
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {repos.map(repo => {
          const isExpanded = expandedRepos[repo.id] ?? true;

          return (
            <div key={repo.id} className="mb-2">
              <div
                onClick={() => toggleRepo(repo.id)}
                className="flex items-center gap-1.5 p-1 rounded hover:bg-[#2a2d2e] cursor-pointer text-slate-200 font-semibold"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
                <FolderGit2 className="w-3.5 h-3.5 shrink-0" style={{ color: repo.color }} />
                <span className="truncate">{repo.name}</span>
              </div>

              {isExpanded && (
                <div className="ml-3 pl-2 border-l border-[#2e2e2e] space-y-1 mt-1">
                  {repo.files.map(file => {
                    const isActive = activeFileId === file.id;

                    return (
                      <div
                        key={file.id}
                        onClick={() => onOpenFile(file)}
                        className={`flex items-center gap-1.5 p-1.5 rounded cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-blue-600/30 text-white font-medium border border-blue-500/40'
                            : 'hover:bg-[#2a2d2e] text-slate-300'
                        }`}
                      >
                        <FileCode2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="font-mono text-xs truncate">
                          {file.relativePath}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
