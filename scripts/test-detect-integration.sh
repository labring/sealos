#!/usr/bin/env bash

# Integration Tests for detect-build-modules.sh
# Uses real git environment for accurate testing

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DETECT_SCRIPT="${SCRIPT_DIR}/detect-build-modules.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test statistics
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
START_TIME=$(date +%s)

# Store failed tests
declare -a FAILED_TESTS=()

# Original branch
ORIGINAL_BRANCH=""
TEST_BRANCH="test-detect-modules-$(date +%s)"

# ============================================================================
# Helper Functions
# ============================================================================

print_color() {
    local color="$1"
    shift
    echo -e "${color}$*${NC}"
}

print_header() {
    echo ""
    print_color "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_color "$CYAN" "$1"
    print_color "$CYAN" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

print_section() {
    echo ""
    print_color "$BLUE" "▸ $1"
}

cleanup() {
    print_color "$YELLOW" "\nCleaning up test environment..."

    # Return to original branch
    if [[ -n "$ORIGINAL_BRANCH" ]]; then
        git checkout "$ORIGINAL_BRANCH" 2>/dev/null || true
    fi

    # Delete test branch
    git branch -D "$TEST_BRANCH" 2>/dev/null || true

    # Restore any changes
    git reset --hard HEAD 2>/dev/null || true
    git clean -fd 2>/dev/null || true
}

# Register cleanup
trap cleanup EXIT INT TERM

# ============================================================================
# Test Framework
# ============================================================================

setup_test_env() {
    print_section "Setting up test environment"

    # Save current branch
    ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    echo "Current branch: $ORIGINAL_BRANCH"

    # Check if we're in a git repo
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_color "$RED" "Error: Not in a git repository"
        exit 1
    fi

    # Check for uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        print_color "$YELLOW" "Warning: You have uncommitted changes"
        print_color "$YELLOW" "The test will create a temporary branch and restore your state afterward"
        read -p "Continue? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    # Create test branch from current HEAD
    print_color "$BLUE" "Creating test branch: $TEST_BRANCH"
    git checkout -b "$TEST_BRANCH" >/dev/null 2>&1

    echo "✓ Test environment ready"
}

run_detection_test() {
    local test_name="$1"
    local type="$2"
    local test_files="$3"  # Files to create/modify
    local force_all="${4:-false}"
    local expected="$5"    # "all", "empty", or comma-separated modules

    TESTS_RUN=$((TESTS_RUN + 1))

    print_color "$YELLOW" "\n[$TESTS_RUN] $test_name"
    echo "  Type: $type"
    echo "  Files: ${test_files:-<none>}"
    echo "  Force: $force_all"
    echo "  Expected: $expected"

    # Reset to base
    git reset --hard "$ORIGINAL_BRANCH" >/dev/null 2>&1
    git clean -fd >/dev/null 2>&1

    # Create test files if specified
    if [[ -n "$test_files" ]]; then
        for file in $test_files; do
            mkdir -p "$(dirname "$file")"
            echo "# Test change" >> "$file"
        done
        git add . >/dev/null 2>&1
        git commit -m "Test: $test_name" >/dev/null 2>&1
    fi

    # Run detection
    local base_ref="$ORIGINAL_BRANCH"
    local output
    local exit_code=0

    output=$(cd "$REPO_ROOT" && bash "$DETECT_SCRIPT" "$type" "$base_ref" "$force_all" 2>&1) || exit_code=$?

    if [[ $exit_code -ne 0 ]]; then
        print_color "$RED" "  ✗ FAILED: Script error (exit $exit_code)"
        print_color "$RED" "  Output: $output"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("$test_name: Script error")
        return 1
    fi

    # Parse result
    local detected
    if [[ "$output" == "[]" ]]; then
        detected="empty"
    else
        detected=$(echo "$output" | jq -r '.[].name' 2>/dev/null | sort | tr '\n' ',' | sed 's/,$//')
        [[ -z "$detected" ]] && detected="empty"
    fi

    echo "  Detected: $detected"

    # Verify
    local success=false

    if [[ "$expected" == "all" ]]; then
        # Count modules
        local module_count=$(echo "$output" | jq '. | length' 2>/dev/null || echo 0)
        if [[ $module_count -ge 10 ]]; then  # At least 10 modules
            success=true
        fi
    elif [[ "$expected" == "empty" ]]; then
        [[ "$detected" == "empty" ]] && success=true
    else
        local expected_sorted=$(echo "$expected" | tr ',' '\n' | sort | tr '\n' ',' | sed 's/,$//')
        local detected_sorted=$(echo "$detected" | tr ',' '\n' | sort | tr '\n' ',' | sed 's/,$//')
        [[ "$expected_sorted" == "$detected_sorted" ]] && success=true
    fi

    if [[ "$success" == true ]]; then
        print_color "$GREEN" "  ✓ PASSED"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_color "$RED" "  ✗ FAILED: Expected '$expected', got '$detected'"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("$test_name")
    fi
}

# ============================================================================
# Test Suites
# ============================================================================

test_force_all() {
    print_header "Force All Tests"

    run_detection_test \
        "Force all controllers" \
        "controllers" \
        "" \
        "true" \
        "all"

    run_detection_test \
        "Force all services" \
        "service" \
        "" \
        "true" \
        "all"
}

test_infrastructure() {
    print_header "Infrastructure Tests"

    run_detection_test \
        "Detection script changed" \
        "controllers" \
        "scripts/detect-build-modules.sh" \
        "false" \
        "all"

    run_detection_test \
        "Golangci config changed" \
        "service" \
        ".golangci.yml" \
        "false" \
        "all"

    run_detection_test \
        "GitHub scripts changed" \
        "controllers" \
        ".github/scripts/install.sh" \
        "false" \
        "all"

    run_detection_test \
        "Manifest script changed" \
        "service" \
        "scripts/manifest-cluster-images.sh" \
        "false" \
        "all"
}

test_workflow_changes() {
    print_header "Workflow Tests"

    run_detection_test \
        "Controllers workflow changed" \
        "controllers" \
        ".github/workflows/controllers.yml" \
        "false" \
        "all"

    run_detection_test \
        "Controller-build workflow changed" \
        "controllers" \
        ".github/workflows/controller-build.yml" \
        "false" \
        "all"

    run_detection_test \
        "Services workflow changed" \
        "service" \
        ".github/workflows/services.yml" \
        "false" \
        "all"
}

test_shared_code() {
    print_header "Shared Code Tests"

    run_detection_test \
        "Controllers pkg changed" \
        "controllers" \
        "controllers/pkg/utils/test.go" \
        "false" \
        "all"

    run_detection_test \
        "Service pkg changed" \
        "service" \
        "service/pkg/database/test.go" \
        "false" \
        "all"

    run_detection_test \
        "Controllers go.sum changed" \
        "controllers" \
        "controllers/go.sum" \
        "false" \
        "all"

    run_detection_test \
        "Root go.work changed" \
        "controllers" \
        "go.work" \
        "false" \
        "all"
}

test_incremental() {
    print_header "Incremental Tests"

    run_detection_test \
        "Single controller changed" \
        "controllers" \
        "controllers/user/main.go" \
        "false" \
        "user"

    run_detection_test \
        "Single service changed" \
        "service" \
        "service/database/main.go" \
        "false" \
        "database"

    run_detection_test \
        "Multiple modules changed" \
        "controllers" \
        "controllers/user/main.go controllers/account/api.go" \
        "false" \
        "account,user"
}

test_edge_cases() {
    print_header "Edge Cases"

    run_detection_test \
        "No changes" \
        "controllers" \
        "" \
        "false" \
        "empty"

    run_detection_test \
        "Only README changed" \
        "service" \
        "service/database/README.md" \
        "false" \
        "empty"

    run_detection_test \
        "Dockerfile changed" \
        "controllers" \
        "controllers/user/Dockerfile" \
        "false" \
        "user"
}

# ============================================================================
# Main
# ============================================================================

main() {
    print_header "Integration Tests for detect-build-modules.sh"

    echo "Repository: $REPO_ROOT"
    echo "Script: $DETECT_SCRIPT"
    echo ""

    # Prerequisites check
    if ! command -v jq &>/dev/null; then
        print_color "$RED" "Error: jq is required"
        exit 1
    fi

    if [[ ! -f "$DETECT_SCRIPT" ]]; then
        print_color "$RED" "Error: Script not found at $DETECT_SCRIPT"
        exit 1
    fi

    # Setup
    setup_test_env

    # Run tests
    test_force_all
    test_infrastructure
    test_workflow_changes
    test_shared_code
    test_incremental
    test_edge_cases

    # Summary
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))

    echo ""
    print_header "Test Summary"
    echo ""
    echo "Total:    $TESTS_RUN"
    print_color "$GREEN" "Passed:   $TESTS_PASSED"

    if [[ $TESTS_FAILED -gt 0 ]]; then
        print_color "$RED" "Failed:   $TESTS_FAILED"
        echo ""
        print_color "$RED" "Failed tests:"
        for test in "${FAILED_TESTS[@]}"; do
            print_color "$RED" "  - $test"
        done
    else
        print_color "$GREEN" "Failed:   0"
    fi

    echo ""
    echo "Duration: ${duration}s"
    echo ""

    if [[ $TESTS_FAILED -eq 0 ]]; then
        print_color "$GREEN" "✓ ALL TESTS PASSED"
        exit 0
    else
        print_color "$RED" "✗ SOME TESTS FAILED"
        exit 1
    fi
}

main "$@"
