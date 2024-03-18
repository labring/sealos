export type TemplateType = {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
  };
  spec: {
    // local json data
    fileName: string;
    filePath: string;
    deployCount?: number;
    // instance
    categories?: string[];
    templateType: 'inline';
    gitRepo: string;
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
  type: string; // string | number | 'choice' | boolean;
  options?: string[];
};

export type TemplateInstanceType = {
  apiVersion: string;
  kind: 'Instance';
  metadata: {
    name: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
  };
  spec: {
    categories: string[];
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
  yamlCR: TemplateInstanceType;
  displayName?: string;
};

export enum ApplicationType {
  All = 'all',
  MyApp = 'myapp'
}

export type SlideDataType = {
  title: string;
  desc: string;
  bg: string;
  image: string;
  borderRadius: string;
  icon: string;
  templateName: string;
};

export type SideBarMenuType = {
  id: string;
  value: string;
  type: ApplicationType;
};

export type SystemConfigType = {
  showCarousel: boolean;
  slideData: SlideDataType[];
};
