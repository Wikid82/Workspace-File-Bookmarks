export type SortMode = 'by-repo' | 'custom-folders' | 'by-tag' | 'flat-list';

export interface Repository {
  id: string;
  name: string; // e.g. 'storefront-web', 'checkout-service'
  path: string; // e.g. '/workspaces/storefront-web'
  color: string; // Hex or tailwind badge color
  icon?: string;
  files: WorkspaceFile[];
}

export interface WorkspaceFile {
  id: string;
  repoId: string;
  repoName: string;
  relativePath: string; // e.g. 'src/components/Cart.tsx'
  language: string; // e.g. 'typescript', 'json', 'python'
  content: string;
}

export interface Bookmark {
  id: string;
  fileId: string;
  repoId: string;
  repoName: string;
  relativePath: string; // e.g. 'src/auth/jwt.ts'
  fileName: string;     // e.g. 'jwt.ts'
  folderId?: string | null; // For custom folder hierarchy
  lineNumber?: number;
  lineContent?: string;
  title?: string;       // Custom label/alias
  notes?: string;       // Developer notes on why bookmarked
  tag?: 'urgent' | 'feature' | 'bug' | 'review' | 'refactor' | 'default';
  colorTag?: string;    // CSS/Hex tag color
  createdAt: number;
}

export interface CustomFolder {
  id: string;
  name: string;        // e.g. '🔥 Sprint 42 Auth Refactor', '📦 Payment Gateway'
  parentId?: string | null; // Nested folder support
  color?: string;
  expanded?: boolean;
}

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  repos: Repository[];
  folders: CustomFolder[];
  bookmarks: Bookmark[];
}

export interface GeneratedFile {
  path: string;        // Relative path in extension project
  language: string;
  content: string;
  description: string;
}

export interface CustomizeExtensionRequest {
  featurePrompt: string;
  existingFiles: GeneratedFile[];
}
