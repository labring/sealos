export const MockInstance = {
  id: 'fastgpt-mock',
  createTime: '2025-05-21 13:56',
  author: 'Sealos',
  description:
    'FastGPT 是一个基于 LLM 大语言模型的知识库问答系统，提供开箱即用的数据处理、模型调用等能力。同时可以通过 Flow 可视化进行工作流编排，从而实现复杂的问答场景！',
  gitRepo: 'https://github.com/labring/FastGPT',
  icon: 'https://cdn.jsdelivr.net/gh/labring/FastGPT@main/.github/imgs/logo.svg',
  readme: 'https://cdn.jsdelivr.net/gh/labring/FastGPT@main/README.md',
  templateType: 'inline',
  title: 'FastGPT',
  url: 'https://ai.fastgpt.in/',
  yamlCR: {}
};

export const MockAppList = [
  {
    id: '0f987555-ca63-4d1a-8593-cae8af4a9d74',
    name: 'fastgpt-mock',
    isPause: false,
    status: {
      label: 'Waiting',
      value: 'Waiting',
      color: '#787A90',
      backgroundColor: '#F5F5F8',
      dotColor: '#787A90'
    },
    createTime: '2025/05/21 13:56',
    cpu: 500,
    memory: 2048,
    activeReplicas: 0,
    maxReplicas: 1,
    minReplicas: 1,
    storeAmount: 0
  },
  {
    id: '84219e3b-2ece-454e-b187-419ddd0841d8',
    name: 'fastgpt-mock-aiproxy',
    isPause: false,
    status: {
      label: 'Waiting',
      value: 'Waiting',
      color: '#787A90',
      backgroundColor: '#F5F5F8',
      dotColor: '#787A90'
    },
    createTime: '2025/05/21 13:56',
    cpu: 1000,
    memory: 1024,
    activeReplicas: 0,
    maxReplicas: 1,
    minReplicas: 1,
    storeAmount: 0
  },
  {
    id: '216afca9-a9dd-4a20-8c98-766d4762caaf',
    name: 'fastgpt-mock-mcp-server',
    isPause: false,
    status: {
      label: 'Running',
      value: 'Running',
      color: '#00A9A6',
      backgroundColor: '#E6F6F6',
      dotColor: '#00A9A6'
    },
    createTime: '2025/05/21 13:56',
    cpu: 500,
    memory: 1024,
    activeReplicas: 1,
    maxReplicas: 1,
    minReplicas: 1,
    storeAmount: 0
  },
  {
    id: '9d2df9ad-b062-4c60-9177-22c8abaa66f5',
    name: 'fastgpt-mock-sandbox',
    isPause: false,
    status: {
      label: 'Running',
      value: 'Running',
      color: '#00A9A6',
      backgroundColor: '#E6F6F6',
      dotColor: '#00A9A6'
    },
    createTime: '2025/05/21 13:56',
    cpu: 500,
    memory: 1024,
    activeReplicas: 1,
    maxReplicas: 1,
    minReplicas: 1,
    storeAmount: 0
  }
];
