# Build directory structure

Before building an image, it is recommended to create a standard directory structure. The sample full directory structure looks like this.

```shell
.
├── charts
│   └── nginx
│       ├── Chart.lock
│       ├── charts
│       ├── Chart.yaml
│       ├── README.md
│       ├── templates
│       ├── values.schema.json
│       └── values.yaml
├── images
│   └── shim
│       └── nginxImages
├── init.sh
├── Kubefile
├── manifests
│   └── nginx
│       ├── deployment.yaml
│       ├── ingress.yaml
│       └── service.yaml
├── opt
│   └── helm
└── registry
```

Description of these directories：

- `Kubefile` (required):  Similar to Dockerfile, it is used to build images.
- `manifests`:  kubernetes yaml is stored here.
- `charts`: Helm charts is stored here.
- `images/shim`: The images that cannot be auto extracted from manifests or helm charts are manual stored here, sealos will automatically pull these images.
- `opt`: Binary files is stored here.
- `registry`: The images pulled to local during the build are stored here. This directory is automatically generated during the build, and manual creation is not required.
- `init.sh`:  Github action will automatically run init.sh, So you can do some automation work in `init.sh`.

## Kubefile Parameters

Parameters supported by Kubefile.

```shell
FROM labring/kubernetes:v1.24.0
ENV version v1.1.0
COPY manifests ./manifests
COPY registry ./registry
ENTRYPOINIT ["kubectl apply -f manifests/tigera-operator.yaml"]
CMD ["kubectl apply -f manifests/custom-resources.yaml"]
```

Description of these Parameters：

- `FROM`: The `FROM` instruction initializes a new build stage and sets the `Base Image` for subsequent instructions. 
- `ENV`: The `ENV` instruction sets the environment variable `<key>` to the value `<value>`. 
- `COPY`:  The `COPY` instruction copies new files or directories from `<src>` and adds them to the filesystem of the container at the path `<dest>`.
- `ENTRYPOINT`: Currently, it has the same functions as CMD.
- `CMD`: The `CMD` instruction  provide default commands for an executing container. 
