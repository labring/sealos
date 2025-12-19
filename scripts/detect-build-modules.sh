#!/usr/bin/env bash

# Script to detect which modules need to be built based on file changes and dependencies
# Usage: detect-build-modules.sh <type> <base-ref> [force-all]
#   type: "controllers" or "service"
#   base-ref: git ref to compare against (e.g., origin/main)
#   force-all: if set to "true", build all modules (for release)

set -euo pipefail

TYPE="${1:-}"
BASE_REF="${2:-origin/main}"
FORCE_ALL="${3:-false}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Source generate-dependencies.sh for generate_dependencies function
source "${REPO_ROOT}/scripts/generate-dependencies.sh"

# Module definitions
declare -A CONTROLLER_MODULES=(
    ["user"]="user"
    ["terminal"]="terminal"
    ["account"]="account"
    ["app"]="app"
    ["license"]="license"
    ["job-init"]="job/init"
    ["job-heartbeat"]="job/heartbeat"
    ["resources"]="resources"
    ["node"]="node"
    ["devbox"]="devbox"
    ["objectstorage"]="objectstorage"
)

declare -A SERVICE_MODULES=(
    ["database"]="database"
    ["pay"]="pay"
    ["account"]="account"
    ["minio"]="minio"
    ["launchpad"]="launchpad"
    ["exceptionmonitor"]="exceptionmonitor"
    ["devbox"]="devbox"
    ["vlogs"]="vlogs"
    ["hubble"]="hubble"
    ["sshgate"]="sshgate"
)

# Function to get all modules for a type
get_all_modules() {
    local type="$1"
    local modules=()

    if [[ "$type" == "controllers" ]]; then
        for name in "${!CONTROLLER_MODULES[@]}"; do
            modules+=("$name")
        done
    else
        for name in "${!SERVICE_MODULES[@]}"; do
            modules+=("$name")
        done
    fi

    # Sort for consistent output
    printf '%s\n' "${modules[@]}" | sort
}

# Manual dependency definitions (for non-Go dependencies or special cases)
# Format: "module:dependency1,dependency2,..."
# These will be merged with auto-detected dependencies from go.mod
declare -A MANUAL_DEPENDENCIES=(
    # Add manual dependencies here if needed
    # Example: ["service/foo"]="controllers/bar,service/baz"
)

# Cache for auto-detected dependencies
declare -A AUTO_DEPENDENCIES=()

# Dependencies cache file
DEPS_CACHE_FILE="${REPO_ROOT}/scripts/dependencies.txt"

# Function to normalize module path to key format
normalize_module_key() {
    local type="$1"
    local module="$2"
    echo "${type}/${module}"
}

load_dependencies() {

    while IFS='=' read -r key deps; do
        [[ -z "$key" ]] && continue
        [[ "$key" == \#* ]] && continue # Skip comments
        AUTO_DEPENDENCIES["$key"]="$deps"
    done <"$DEPS_CACHE_FILE"

    echo "Loaded ${#AUTO_DEPENDENCIES[@]} module dependencies" >&2
}

# Function to get all dependencies (from cache + manual)
get_all_dependencies() {
    local type="$1"
    local module="$2"
    local key
    key=$(normalize_module_key "$type" "$module")

    # Get cached dependencies
    local auto_deps="${AUTO_DEPENDENCIES[$key]:-}"

    # Get manual dependencies
    local manual_deps="${MANUAL_DEPENDENCIES[$key]:-}"

    # Merge dependencies
    local all_deps=""
    if [[ -n "$manual_deps" ]]; then
        all_deps="$manual_deps"
    fi
    if [[ -n "$auto_deps" ]]; then
        if [[ -n "$all_deps" ]]; then
            all_deps="${all_deps},${auto_deps}"
        else
            all_deps="$auto_deps"
        fi
    fi

    # Remove duplicates
    if [[ -n "$all_deps" ]]; then
        all_deps=$(echo "$all_deps" | tr ',' '\n' | sort -u | tr '\n' ',' | sed 's/,$//')
    fi

    echo "$all_deps"
}

# Function to get module path
get_module_path() {
    local type="$1"
    local module="$2"

    if [[ "$type" == "controllers" ]]; then
        # Check if module exists in array
        if [[ -v "CONTROLLER_MODULES[$module]" ]]; then
            echo "${CONTROLLER_MODULES[$module]}"
        fi
    else
        # Check if module exists in array
        if [[ -v "SERVICE_MODULES[$module]" ]]; then
            echo "${SERVICE_MODULES[$module]}"
        fi
    fi
}

# Function to check if a module has changes
module_has_changes() {
    local type="$1"
    local module="$2"
    local module_path
    module_path=$(get_module_path "$type" "$module")

    # If module path is empty (module not found), return false
    if [[ -z "$module_path" ]]; then
        return 1
    fi

    # Check if any files in the module directory have changed
    if git diff --name-only "$BASE_REF" HEAD | grep -q "^${type}/${module_path}/"; then
        return 0
    fi
    return 1
}

# Function to find modules that depend on a given module
find_dependent_modules() {
    local target_type="$1"
    local target_module="$2"
    local target_key
    target_key=$(normalize_module_key "$target_type" "$target_module")

    local dependent_modules=()

    # Check all modules in both controllers and services
    for check_type in "controllers" "service"; do
        local modules
        modules=$(get_all_modules "$check_type")

        while IFS= read -r module; do
            [[ -z "$module" ]] && continue

            local deps
            deps=$(get_all_dependencies "$check_type" "$module")

            if [[ -z "$deps" ]]; then
                continue
            fi

            # Split dependencies by comma
            IFS=',' read -ra dep_array <<<"$deps"
            for dep in "${dep_array[@]}"; do
                # Remove leading/trailing whitespace
                dep=$(echo "$dep" | xargs)

                # Check if this dependency matches the target module
                if [[ "$dep" == "$target_key" ]]; then
                    # Only add if it's the same type we're building
                    if [[ "$check_type" == "$TYPE" ]]; then
                        dependent_modules+=("$module")
                    fi
                fi
            done
        done <<<"$modules"
    done

    printf '%s\n' "${dependent_modules[@]}" | sort -u
}

# Function to recursively find all affected modules
find_affected_modules() {
    local type="$1"
    local -a changed_modules=("${@:2}")
    local -A affected=()
    local -A visited=()

    # Add directly changed modules
    for module in "${changed_modules[@]}"; do
        affected["$module"]=1
    done

    # Find all dependent modules recursively
    local -a to_process=("${changed_modules[@]}")
    while [[ ${#to_process[@]} -gt 0 ]]; do
        local current="${to_process[0]}"
        to_process=("${to_process[@]:1}")

        # Skip if already visited
        if [[ -n "${visited[$current]:-}" ]]; then
            continue
        fi
        visited["$current"]=1

        # Find modules that depend on current
        local dependents
        dependents=$(find_dependent_modules "$type" "$current")

        if [[ -n "$dependents" ]]; then
            while IFS= read -r dep; do
                if [[ -z "${affected[$dep]:-}" ]]; then
                    affected["$dep"]=1
                    to_process+=("$dep")
                fi
            done <<<"$dependents"
        fi
    done

    # Output sorted unique list
    for module in "${!affected[@]}"; do
        echo "$module"
    done | sort
}

# Function to check for shared code changes
check_shared_code_changes() {
    local type="$1"

    # Check for changes in shared directories and dependency files
    if [[ "$type" == "controllers" ]]; then
        if git diff --name-only "$BASE_REF" HEAD | grep -qE "^controllers/(pkg/|go\.mod$|go\.work$|go\.sum$)"; then
            return 0
        fi
    else
        if git diff --name-only "$BASE_REF" HEAD | grep -qE "^service/(pkg/|go\.mod$|go\.work$|go\.sum$)"; then
            return 0
        fi
    fi

    # Check for root workspace configuration changes (affects all modules)
    if git diff --name-only "$BASE_REF" HEAD | grep -qE "^go\.(work|work\.sum)$"; then
        return 0
    fi

    return 1
}

# Function to check for workflow changes
check_workflow_changes() {
    local type="$1"

    # Check for changes in workflow files that affect this type
    if [[ "$type" == "controllers" ]]; then
        # Check for controllers.yml or controller-build.yml changes
        if git diff --name-only "$BASE_REF" HEAD | grep -qE "^\.github/workflows/(controllers\.yml|controller-build\.yml)$"; then
            return 0
        fi
    else
        # Check for services.yml or service-build.yml changes
        if git diff --name-only "$BASE_REF" HEAD | grep -qE "^\.github/workflows/(services\.yml|service-build\.yml)$"; then
            return 0
        fi
    fi
    return 1
}

# Function to check for critical infrastructure changes
check_infrastructure_changes() {
    # Check for detection script itself
    if git diff --name-only "$BASE_REF" HEAD | grep -q "^scripts/detect-build-modules\.sh$"; then
        echo "Detection script changed" >&2
        return 0
    fi

    # Check for golangci-lint configuration
    if git diff --name-only "$BASE_REF" HEAD | grep -q "^\.golangci\.yml$"; then
        echo "Lint configuration changed" >&2
        return 0
    fi

    # Check for shared build/deploy scripts
    if git diff --name-only "$BASE_REF" HEAD | grep -qE "^\.github/scripts/.*\.sh$"; then
        echo "Shared GitHub scripts changed" >&2
        return 0
    fi

    # Check for cluster image manifest script
    if git diff --name-only "$BASE_REF" HEAD | grep -q "^scripts/manifest-cluster-images\.sh$"; then
        echo "Manifest script changed" >&2
        return 0
    fi

    return 1
}

# Function to check for cross-project dependency changes
# Adds affected modules to the provided array
check_cross_project_dependencies() {
    local type="$1"
    local -n affected_modules="$2" # nameref to modify the array

    # Currently only check when building services
    # (services may depend on controllers)
    if [[ "$type" != "service" ]]; then
        return
    fi

    echo "Checking cross-project dependencies..." >&2

    for module in $(get_all_modules "$type"); do
        local deps
        deps=$(get_all_dependencies "$type" "$module")

        if [[ -z "$deps" ]]; then
            continue
        fi

        # Check if any dependency has changes
        IFS=',' read -ra dep_array <<<"$deps"
        for dep in "${dep_array[@]}"; do
            dep=$(echo "$dep" | xargs)

            # Parse dependency: "controllers/account" or "service/database"
            if [[ "$dep" =~ ^(controllers|service)/(.+)$ ]]; then
                local dep_type="${BASH_REMATCH[1]}"
                local dep_module="${BASH_REMATCH[2]}"

                # Check if the dependency module has changes
                if module_has_changes "$dep_type" "$dep_module"; then
                    echo "Cross-project dependency changed: $dep (affects $module)" >&2
                    # Add this module to affected list if not already present
                    if [[ ! " ${affected_modules[@]} " =~ " ${module} " ]]; then
                        affected_modules+=("$module")
                    fi
                    break
                fi
            fi
        done
    done
}

# Main logic
main() {
    local -a modules_to_build=()

    # Generate dependencies
    generate_dependencies

    if [[ ! -f "$DEPS_CACHE_FILE" ]]; then
        echo "Error: Failed to generate dependencies" >&2
        return 1
    fi

    if [[ "$TYPE" != "controllers" && "$TYPE" != "service" ]]; then
        echo "Error: TYPE must be 'controllers' or 'service'" >&2
        exit 1
    fi

    # Generate and load dependencies
    load_dependencies

    # If force-all is true, build all modules (for release)
    if [[ "$FORCE_ALL" == "true" ]]; then
        echo "Building all modules (force-all: $FORCE_ALL)" >&2
        modules_to_build=($(get_all_modules "$TYPE"))
    # Check for critical infrastructure changes (detection script, lint config, build scripts)
    elif check_infrastructure_changes; then
        echo "Critical infrastructure changed, building all modules" >&2
        modules_to_build=($(get_all_modules "$TYPE"))
    # Check for workflow changes (requires rebuilding all modules)
    elif check_workflow_changes "$TYPE"; then
        echo "Workflow changed, building all modules" >&2
        modules_to_build=($(get_all_modules "$TYPE"))
    # Check for shared code changes (requires rebuilding all modules)
    elif check_shared_code_changes "$TYPE"; then
        echo "Shared code changed, building all modules" >&2
        modules_to_build=($(get_all_modules "$TYPE"))
    else
        # Find modules with direct changes
        local -a changed_modules=()

        for module in $(get_all_modules "$TYPE"); do
            if module_has_changes "$TYPE" "$module"; then
                changed_modules+=("$module")
            fi
        done

        # Check for cross-project dependency changes
        # If building services, check if any controllers dependencies changed
        check_cross_project_dependencies "$TYPE" changed_modules

        if [[ ${#changed_modules[@]} -eq 0 ]]; then
            echo "No module changes detected" >&2
            echo "[]"
            return 0
        fi

        echo "Changed modules: ${changed_modules[*]}" >&2

        # Find all affected modules (including dependents)
        modules_to_build=($(find_affected_modules "$TYPE" "${changed_modules[@]}"))
    fi

    # Build JSON matrix output
    if [[ ${#modules_to_build[@]} -eq 0 ]]; then
        echo "[]"
    else
        echo "Modules to build: ${modules_to_build[*]}" >&2

        local json="["
        local first=true

        for module in "${modules_to_build[@]}"; do
            local module_path
            module_path=$(get_module_path "$TYPE" "$module")

            if [[ "$first" == true ]]; then
                first=false
            else
                json+=","
            fi

            json+="{\"name\":\"$module\",\"path\":\"$module_path\"}"
        done

        json+="]"
        echo "$json"
    fi
}

main
