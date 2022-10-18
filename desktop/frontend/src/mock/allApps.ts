const defaultApps = [
  {
    name: 'Mysql',
    icon: 'https://cloud.sealos.io/images/mysql.svg',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'Percona XtraDB Cluster (PXC) is an open-source enterprise MySQL solution that helps you to ensure data availability for your applications while improving security and simplifying the development of new applications in the most demanding public, private, and hybrid cloud environments',
      feat:
        'Easy deployment with no single point of failure\n' +
        'Load balancing and proxy service with either HAProxy or ProxySQL\n' +
        'Scheduled and manual backups'
    }
  },
  {
    name: 'Redis',
    icon: 'https://cloud.sealos.io/images/redis.svg',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'Redis Operator creates/configures/manages redis-failovers atop Kubernetes.',
      feat: 'In order to create Redis failovers inside a Kubernetes cluster, the operator has to be deployed. It can be done with deployment or with the provided Helm chart.'
    }
  },
  {
    name: 'Prometheus',
    icon: 'https://cloud.sealos.io/images/prometheus.svg',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'This repository collects Kubernetes manifests, Grafana dashboards, and Prometheus rules combined with documentation and scripts to provide easy to operate end-to-end Kubernetes cluster monitoring with Prometheus using the Prometheus Operator.',
      feat:
        'The Prometheus Operator\n' +
        'Highly available Prometheus\n' +
        'Highly available Alertmanager\n' +
        'Prometheus node-exporter\n' +
        'Prometheus Adapter for Kubernetes Metrics APIs\n' +
        'kube-state-metrics\n' +
        'Grafana'
    }
  },
  {
    name: 'Kuboard',
    icon: 'https://cloud.sealos.io/images/kuboard.svg',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'kubernetes dashboad',
      feat: 'kubernetes dashboard'
    }
  },
  {
    name: 'nginx',
    icon: 'https://artifacthub.io/image/e3e91b10-40e0-4f04-b088-85778256ecf7@1x',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'Ingress controller for Kubernetes using NGINX as a reverse proxy and load balancer',
      feat:
        'To use, add ingressClassName: nginx spec field or the kubernetes.io/ingress.class: nginx annotation to your Ingress resources.\n' +
        '\n' +
        'This chart bootstraps an ingress-nginx deployment on a  cluster using the  package manager.'
    }
  },

  {
    name: 'argo-cd',
    icon: 'https://artifacthub.io/image/21c68f0c-1e74-4ef8-9b58-06e34ed961c3@1x',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'A Helm chart for Argo CD, a declarative, GitOps continuous delivery tool for Kubernetes',
      feat: 'This is a community maintained chart. This chart installs , a declarative, GitOps continuous delivery tool for Kubernetes.'
    }
  },
  {
    name: 'Harbor',
    icon: 'https://artifacthub.io/image/93376a3e-0c15-4dfd-b747-5f11576321fb@2x',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'An open source trusted cloud native registry that stores, signs, and scans content',
      feat: 'This repository, including the issues, focuses on deploying Harbor chart via helm. For functionality issues or Harbor questions, please open issues on '
    }
  },
  {
    name: 'Cilium',
    icon: 'https://artifacthub.io/image/2ae85972-bf12-41a5-afb2-9b1147b2aa56@2x',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'eBPF-based Networking, Security, and Observability',
      feat: 'Cilium is open source software for providing and transparently securing network connectivity and loadbalancing between application workloads such as application containers or processes. Cilium operates at Layer 3/4 to provide traditional networking and security services as well as Layer 7 to protect and secure use of modern application protocols such as HTTP, gRPC and Kafka.'
    }
  },
  {
    name: 'pgsql',
    icon: 'https://artifacthub.io/image/61ef8ba4-4c21-438e-a0a2-e35628f1e193@2x',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'pgAdmin4 is a web based administration tool for PostgreSQL database',
      feat: ' is the leading Open Source management tool for Postgres, the world’s most advanced Open Source database. pgAdmin4 is designed to meet the needs of both novice and experienced Postgres users alike, providing a powerful graphical interface that simplifies the creation, maintenance and use of database objects.'
    }
  },
  {
    name: 'Nginx-ingress',
    icon: 'https://artifacthub.io/image/62c16f84-a100-4147-9577-4b1133ce2ab4@2x',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'NGINX Ingress Controller',
      feat: 'This chart deploys the NGINX Ingress Controller in your Kubernetes cluster.'
    }
  },
  {
    name: 'gitea',
    icon: 'https://artifacthub.io/image/6ed2c189-0760-45db-9b18-c30368c43619@1x',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'Gitea Helm chart for Kubernetes',
      feat: ' is a community managed lightweight code hosting solution written in Go. It is published under the MIT license.'
    }
  },
  {
    name: 'jaeger',
    icon: 'https://artifacthub.io/image/11252ebc-4a8c-4d12-bdca-01f583e483b4@1x',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'A Jaeger Helm chart for Kubernetes',
      feat: 'This chart adds all components required to run Jaeger as described in the  GitHub page for a production-like deployment. The chart default will deploy a new Cassandra cluster (using the ), but also supports using an existing Cassandra cluster, deploying a new ElasticSearch cluster (using the ), or connecting to an existing ElasticSearch cluster. Once the storage backend is available, the chart will deploy jaeger-agent as a DaemonSet and deploy the jaeger-collector and jaeger-query components as Deployments.'
    }
  },
  {
    name: 'kyverno',
    icon: 'https://artifacthub.io/image/46c2e3db-f88c-441b-9b5a-62d517963d1d@1x',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'Kubernetes Native Policy Management',
      feat:
        'Manage policies as Kubernetes resources (no new language required.)\n' +
        'Validate, mutate, and generate resource configurations.\n' +
        'Select resources based on labels and wildcards.\n' +
        'View policy enforcement as events.\n' +
        'Scan existing resources for violations.'
    }
  },
  {
    name: 'metabase',
    icon: 'https://artifacthub.io/image/699b4cbd-f931-4fe0-b42f-0c922ec54ce6@1x',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'The easy, open source way for everyone in your company to ask questions and learn from data.',
      feat: 'This chart bootstraps a  deployment on a  cluster using the  package manager.'
    }
  },

  {
    name: 'minio',
    icon: 'https://artifacthub.io/image/af140541-e229-486c-a807-eaf06b76b032@1x',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'High Performance, Kubernetes Native Object Storage',
      feat: 'This helm chart is in code freeze i.e we will only update MinIO releases occastionally by bumping up the version. For latest features you are advised to start using our .'
    }
  },
  {
    name: 'dex',
    icon: 'https://artifacthub.io/image/1cb6a79a-8fb1-42db-afc8-a259fce5562f@1x',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'OpenID Connect (OIDC) identity and OAuth 2.0 provider with pluggable connectors.',
      feat: 'OpenID Connect (OIDC) identity and OAuth 2.0 provider with pluggable connectors.'
    }
  },
  {
    name: 'openebs',
    icon: 'https://artifacthub.io/image/0f19f44c-a7e4-4446-8e6e-9dea599bcd25@1x',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'Containerized Attached Storage for Kubernetes',
      feat: ' helps Developers and Platform SREs easily deploy Kubernetes Stateful Workloads that require fast and highly reliable container attached storage. OpenEBS can be deployed on any Kubernetes cluster - either in cloud, on-premise (virtual or bare metal) or developer laptop (minikube).'
    }
  },
  {
    name: 'nats',
    icon: 'https://artifacthub.io/image/59ea61a1-b8f5-4602-959c-2c09976b103b@1x',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'A Helm chart for the NATS.io High Speed Cloud Native Distributed Communications Technology.',
      feat: ' is a simple, secure and performant communications system for digital systems, services and devices. NATS is part of the Cloud Native Computing Foundation (). NATS has over , and its server can run on-premise, in the cloud, at the edge, and even on a Raspberry Pi. NATS can secure and simplify design and operation of modern distributed systems.'
    }
  },
  {
    name: 'elasticsearch',
    icon: 'https://artifacthub.io/image/5b158352-afad-4493-86f6-ef225658c812@1x',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'Run Elasticsearch, Kibana, APM Server, Beats, Enterprise Search, Elastic Agent and Elastic Maps Server on Kubernetes and OpenShift',
      feat: 'Elastic Cloud on Kubernetes (ECK) is the official operator by Elastic for automating the deployment, provisioning, management, and orchestration of Elasticsearch, Kibana, APM Server, Beats, Enterprise Search, Elastic Agent and Elastic Maps Server on Kubernetes.'
    }
  },
  {
    name: 'linkerd',
    icon: 'https://artifacthub.io/image/852fb04f-f5c7-4189-8370-0031a7d66291@1x',
    type: 'app',
    size: 'maximize',
    gallery: ['https://code.visualstudio.com/assets/home/home-screenshot-win.png'],
    data: {
      url: 'https://github1s.com/blueedgetechno/win11React',
      desc: 'The Linkerd-Viz extension contains observability and visualization components for Linkerd.',
      feat:
        'You can run Linkerd on any Kubernetes 1.21+ cluster in a matter of seconds. See the  for how.\n' +
        '\n' +
        'For more comprehensive documentation, start with the .'
    }
  }
];

export default defaultApps;
