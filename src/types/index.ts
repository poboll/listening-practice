export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  type: string;
}

export interface DirectoryContent {
  path: string;
  items: FileItem[];
}

export interface FileContentResponse {
  path: string;
  type: string;
}
