export type TemplateType = {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
  };
  spec: {
    gitRepo: string; // new
    templateType: 'inline'; // new
    template_type?: string;
    author: string;
    title: string;
    url: string;
    readme: string;
    icon: string;
    description: string;
    draft: boolean;
    defaults: Record<
      string,
      {
        type: string;
        value: string;
      }
    >;
    inputs: Record<
      string,
      {
        description: string;
        type: string;
        default: string;
        required: boolean;
      }
    >;
  };
};

export type TemplateSourceType = {
  source: {
    defaults: Record<
      string,
      {
        type: string;
        value: string;
      }
    >;
    inputs: FormSourceInput[];
    SEALOS_CERT_SECRET_NAME: string;
    SEALOS_CLOUD_DOMAIN: string;
    SEALOS_NAMESPACE: string;
  };
  yamlList: any[];
  templateYaml: TemplateType;
};

export type ProcessedTemplateSourceType = {
  defaults: Record<
    string,
    {
      type: string;
      value: string;
    }
  >;
  inputs: FormSourceInput[];
};

export type YamlType = {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    labels: { [key: string]: string };
  };
};

export type FormSourceInput = {
  default: string;
  description: string;
  key: string;
  label: string;
  required: boolean;
  type: string;
};

export type TemplateInstanceType = {
  apiVersion: string;
  kind: 'Instance';
  metadata: {
    name: string;
    creationTimestamp?: string;
  };
  spec: {
    gitRepo: string;
    templateType: string;
    author: string;
    title: string;
    url: string;
    readme: string;
    icon: string;
    description: string;
    draft: boolean;
    defaults: Record<
      string,
      {
        type: string;
        value: string;
      }
    >;
    inputs: Record<
      string,
      {
        description: string;
        type: string;
        default: string;
        required: boolean;
      }
    >;
  };
};

export type InstanceListType = {
  apiVersion: string;
  kind: 'InstanceList';
  metadata: {
    continue: string;
  };
  items: TemplateInstanceType[];
};

export type InstanceListItemType = {
  id: string;
  createTime: string;
  author: string;
  description: string;
  gitRepo: string;
  icon: string;
  readme: string;
  templateType: string;
  title: string;
  url: string;
};
