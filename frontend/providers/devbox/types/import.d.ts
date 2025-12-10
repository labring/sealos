export interface GitImportFormData {
  name: string;
  gitUrl: string;
  isPrivate: boolean;
  token?: string;
  templateRepositoryUid: string;
  templateUid: string;
  containerPort: number;
  startupCommand?: string;
  autoStart?: boolean;
}

export interface LocalImportFormData {
  name: string;
  file: File | null;
  templateRepositoryUid: string;
  templateUid: string;
  containerPort: number;
  startupCommand?: string;
  autoStart?: boolean;
}

export type ImportType = 'git' | 'local';

export type ImportStage = 'idle' | 'creating' | 'waiting' | 'cloning' | 'uploading' | 'extracting' | 'configuring' | 'starting' | 'success' | 'error';

export interface ImportProgress {
  stage: ImportStage;
  message: string;
  error?: string;
}

export interface LocalImportRequest {
  name: string;
  runtime: string;
  templateUid: string;
  containerPort: number;
  startupCommand?: string;
  cpu: number;
  memory: number;
}

export interface ImportResponse {
  devboxName: string;
  sshPort?: number;
}
