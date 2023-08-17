export type SystemConfigType = {
  scripts: ScriptConfig[];
};

export type ScriptConfig = {
  src: string;
  'data-website-id'?: string;
};
