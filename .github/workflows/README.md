# GitHub Workflows Documentation

This document provides an overview of the GitHub workflows in this repository and instructions on how to add new components to the workflows.

## Table of Contents

- [Workflow Overview](#workflow-overview)
- [Main Workflow Files](#main-workflow-files)
- [Adding New Components](#adding-new-components)
  - [Adding a New Controller](#adding-a-new-controller)
  - [Adding a New DB Controller](#adding-a-new-db-controller)
  - [Adding a New Job Controller](#adding-a-new-job-controller)
  - [Adding a New Service](#adding-a-new-service)
  - [Adding a New Webhook](#adding-a-new-webhook)
  - [Adding a New Frontend Provider](#adding-a-new-frontend-provider)

## Workflow Overview

The GitHub workflows in this repository are designed to automate the build, test, and deployment processes for various components of the Sealos project. The workflows are triggered by events such as pushes to the main branch or pull requests, and they only run when files in specific directories are modified.

The workflows use a path filtering mechanism (via the `dorny/paths-filter@v3` action) to determine which components have been modified and need to be processed. This allows for efficient CI/CD by only building and testing the components that have changed.

## Main Workflow Files

### Entry Workflows

These workflows serve as entry points that detect changes and trigger the appropriate component-specific workflows:

- **backend-entry.yml**: Detects changes in controllers, webhooks, and services
- **frontend-entry.yml**: Detects changes in frontend providers and desktop
- **sealos-entry.yml**: Entry point for Sealos core components
- **sealos-cloud-entry.yml**: Entry point for Sealos cloud components

### Component Workflows

These workflows are called by the entry workflows to process specific components:

- **backend.yml**: Processes backend components (controllers, webhooks, services)
- **frontend.yml**: Processes frontend components
- **build-backend-image.yml**: Builds Docker images for backend components
- **build-frontend-image.yml**: Builds Docker images for frontend components
- **build-cluster-image.yml**: Builds cluster images
- **build-sealos-image.yml**: Builds Sealos core images

### Utility Workflows

- **golangci-lint.yml**: Runs linting for Go code
- **check-semgrep.yml**: Runs Semgrep code analysis
- **prepare-image-info.yml**: Prepares image information for builds
- **fetch-sealos.yml**: Fetches the Sealos binary
- **merge-and-push.yml**: Merges and pushes images
- **set-labels.yml**: Sets labels on PRs
- **release.yml**: Handles release processes
- **delete_workflow.yml**: Deletes workflow runs

## Adding New Components

### Adding a New Controller

1. Create your controller in the `controllers/` directory (e.g., `controllers/mycontroller/`)
2. Add an entry to `.github/controller-filters.yml`:

```yaml
mycontroller:
- 'controllers/mycontroller/**'
```

The workflow will automatically detect changes in your controller directory and trigger the appropriate build processes.

### Adding a New DB Controller

1. Create your DB controller in the `controllers/db/` directory (e.g., `controllers/db/mydbcontroller/`)
2. Add an entry to `.github/db-controller-filters.yml`:

```yaml
mydbcontroller:
- 'controllers/db/mydbcontroller/**'
```

### Adding a New Job Controller

1. Create your job controller in the `controllers/job/` directory (e.g., `controllers/job/myjobcontroller/`)
2. Add an entry to `.github/job-controller-filters.yml`:

```yaml
myjobcontroller:
- 'controllers/job/myjobcontroller/**'
```

### Adding a New Service

1. Create your service in the `service/` directory (e.g., `service/myservice/`)
2. Add an entry to `.github/service-filters.yml`:

```yaml
myservice:
- 'service/myservice/**'
```

### Adding a New Webhook

1. Create your webhook in the `webhooks/` directory (e.g., `webhooks/mywebhook/`)
2. Add an entry to `.github/webhook-filters.yml`:

```yaml
mywebhook:
- 'webhooks/mywebhook/**'
```

### Adding a New Frontend Provider

1. Create your frontend provider in the `frontend/providers/` directory (e.g., `frontend/providers/myprovider/`)
2. Add an entry to `.github/frontend-filters.yml`:

```yaml
myprovider:
- 'frontend/providers/myprovider/**'
```

## Workflow Execution Process

1. When code is pushed or a PR is created, the entry workflows check which files have changed
2. The entry workflows use path filters to determine which components need to be processed
3. For each affected component, the entry workflow calls the appropriate component workflow
4. The component workflow runs linting, builds Docker images, and (if applicable) builds cluster images
5. If the event is a push to the main branch, the images are also pushed to the container registry

This modular approach allows for efficient CI/CD by only processing the components that have changed, while also making it easy to add new components to the system.
