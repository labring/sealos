# Sealos Cloud Operating System Development Instructions

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Prerequisites and Dependencies
- **Operating System**: Linux required (sealos binary requires CGO for overlay driver support)
- **Go**: Version 1.23+ (validated with go1.24.6)
- **Node.js**: Version 20.4.0+ for frontend (validated with v20.19.4)
- **Package Managers**: Make, pnpm (for frontend), npm
- **Container Tools**: Docker (optional for local development)

Install required system dependencies:
```bash
sudo apt-get update && sudo apt-get install -y pkg-config libdevmapper-dev libbtrfs-dev libgpgme-dev build-essential
```

### Repository Structure
- **`/lifecycle`**: Main sealos CLI and core binaries (sealos, sealctl, lvscare, image-cri-shim) 
- **`/controllers`**: Multiple Kubernetes controllers with individual Go modules and Makefiles
- **`/frontend`**: Next.js workspace with pnpm, 23 sub-projects (desktop, providers)
- **`/service`**: Backend Go services with individual modules  
- **`/webhooks`**: Kubernetes admission webhooks
- **`/docs`**: Documentation and guides

### Bootstrap and Build Process

#### Core sealos CLI Build (lifecycle directory)
```bash
cd lifecycle
make build BINS=sealos     # Build single binary - takes 4 minutes first time, NEVER CANCEL
make build                 # Build all binaries - takes 15 seconds after first build
```

**CRITICAL BUILD TIMING**:
- **First build**: 3-4 minutes - NEVER CANCEL. Set timeout to 300+ seconds
- **Subsequent builds**: 10-15 seconds - Set timeout to 60+ seconds
- **All core binaries**: sealos (101MB), sealctl (93MB), lvscare (36MB), image-cri-shim (20MB)

#### Controller Build (any controller directory)
```bash
cd controllers/user        # or any controller directory
make build                 # Takes 1-2 minutes first time - NEVER CANCEL
```

**Controller build times**: 
- First build: 1-2 minutes per controller
- Subsequent builds: 15-30 seconds

#### Frontend Build (requires network access)
```bash
cd frontend
npm install -g pnpm        # Install pnpm if not available
pnpm install              # May fail due to network restrictions - this is expected
```

**Frontend limitations**: The frontend requires external package downloads that may fail in restricted environments. Document as "network-dependent" if install fails.

### Testing and Validation

#### Unit Tests (limited due to environment requirements)
```bash
cd lifecycle
go test ./pkg/utils/... -v   # Some tests may fail due to hardcoded paths - this is expected
```

#### Functional Validation (what works in sandboxed environment)
```bash
cd lifecycle
./bin/linux_amd64/sealos version      # Always works
./bin/linux_amd64/sealos help         # Always works  
./bin/linux_amd64/sealos env          # Always works
./bin/linux_amd64/sealos completion bash > /tmp/completion.bash  # Always works
./bin/linux_amd64/sealctl hostname    # Always works
```

#### Validation scenarios that require privileges (will fail in sandbox)
```bash
./bin/linux_amd64/sealos images       # Fails: "Operation not permitted"
./bin/linux_amd64/sealos gen ...      # Fails: needs unshare privileges
```

**Testing limitations**: Many sealos commands require Linux capabilities (unshare, overlay mounts) that are not available in sandboxed environments. Focus on build validation and basic command help/version testing.

### Code Quality and Linting

#### Format code
```bash
cd lifecycle
make format                # Takes 3-5 seconds - NEVER CANCEL
```

#### Lint code (has known issues)
```bash
cd lifecycle
make lint                  # Takes 1 minute - NEVER CANCEL, may show type errors - this is expected
```

**Linting expectations**: The linter may show type checking errors in buildah integration code. These are known issues and should not block development.

## Key Components and Binaries

### Core Binaries
- **sealos**: Main CLI for Kubernetes cluster management and OCI image operations
- **sealctl**: System management utilities (network, IPVS, hostname management)
- **lvscare**: Load balancer and IPVS management for Kubernetes
- **image-cri-shim**: Container runtime interface shim

### Main Commands Overview
- `sealos run/apply`: Deploy cloud native applications with or without existing cluster
- `sealos build`: Build OCI images using Containerfile/Kubefile 
- `sealos gen`: Generate Clusterfile configurations
- `sealos add/delete`: Node management
- `sealos images/pull/push`: Image management operations

## Development Workflows

### Making Changes to Core CLI
1. Edit code in `/lifecycle` directory
2. Build: `cd lifecycle && make build`
3. Test basic functionality: `./bin/linux_amd64/sealos version`
4. Format: `make format`
5. Build again to ensure no errors

### Making Changes to Controllers  
1. Edit code in `/controllers/<controller-name>` directory
2. Build: `make build` 
3. Test: Check that binary is created in `bin/manager`

### Making Changes to Frontend
1. Edit code in `/frontend` directory
2. Install deps: `pnpm install` (may fail due to network)
3. Build individual packages: `pnpm -r --filter './packages/*' run build`

## Critical Timing and Cancellation Warnings

**NEVER CANCEL THESE OPERATIONS**:
- `make build` (first time): Wait 4+ minutes
- `make lint`: Wait 1+ minutes  
- `make format`: Wait 5+ seconds
- Controller builds (first time): Wait 2+ minutes
- `pnpm install`: Wait 2+ minutes (may fail due to network)

**Always set appropriate timeouts**:
- Build operations: 300+ seconds
- Lint operations: 120+ seconds
- Network operations: 180+ seconds

## Cross-Platform Notes
- **sealos binary**: Must be built on Linux due to CGO dependencies for overlay driver
- **Other binaries**: Can be cross-compiled with `CGO_ENABLED=0`
- **Frontend**: Platform independent but requires Node.js 20.4.0+

## CI/CD Integration
- Main CI pipeline: `.github/workflows/ci.yml`
- Format checking: `.github/workflows/check-format-code.yml`  
- License checking: `.github/workflows/check-license.yml`
- Frontend builds: `.github/workflows/frontend.yml`

Always run `make format` before committing to pass CI format checks.

## Troubleshooting Common Issues

### Build Failures
- Missing dependencies: Install system packages listed in Prerequisites
- Go version: Ensure Go 1.23+
- Network timeouts: Increase timeout settings, don't cancel

### Test Failures  
- Unit tests: May fail due to hardcoded paths - focus on build validation
- Privilege errors: Expected in sandboxed environments for sealos commands

### Frontend Issues
- Network restrictions: pnpm install may fail - document this limitation
- Node version: Ensure Node.js 20.4.0+

## Working with Go Workspace
Sealos uses Go 1.18+ workspace feature. When adding new modules:
```bash
go work use -r .  # Update workspace from root directory
```

This maintains the multi-module workspace structure across lifecycle, controllers, services, and webhooks.