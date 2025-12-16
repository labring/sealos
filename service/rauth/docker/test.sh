#!/bin/bash
# Don't use set -e as tests may have non-zero exit codes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

log_info() { echo -e "${YELLOW}[INFO]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((PASSED++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAILED++)); }

# ===========================================
# Setup
# ===========================================
setup() {
    log_info "Setting up test environment..."

    # Generate certs if not exist
    if [[ ! -f "certs/token.key" ]] || [[ ! -f "certs/token.crt" ]]; then
        log_info "Generating certificates..."
        mkdir -p certs
        openssl genrsa -out certs/token.key 2048 2>/dev/null
        openssl req -new -x509 -days 365 \
            -key certs/token.key \
            -out certs/token.crt \
            -subj "/CN=rauth/O=rauth/C=US" 2>/dev/null
        log_info "Certificates generated"
    fi

    # Build and start containers
    log_info "Building and starting containers..."
    docker-compose build --quiet rauth 2>/dev/null || docker-compose build rauth
    docker-compose up -d 2>/dev/null

    # Wait for healthy
    log_info "Waiting for services to be ready..."
    for i in {1..30}; do
        if docker-compose ps 2>/dev/null | grep -q "healthy"; then
            break
        fi
        sleep 1
    done
    sleep 2

    # Clear any existing auth
    docker logout localhost:5000 2>/dev/null || true
}

# ===========================================
# Test Cases
# ===========================================
test_unauthenticated_pull() {
    log_info "Test: Unauthenticated pull should fail"
    if docker pull localhost:5000/team-a/test:latest 2>&1 | grep -q "unauthorized\|401"; then
        log_pass "Unauthenticated pull rejected"
    else
        log_fail "Unauthenticated pull should be rejected"
    fi
}

test_wrong_password() {
    log_info "Test: Wrong password login should fail"
    if docker login localhost:5000 -u team-a -p wrong-password 2>&1 | grep -q "unauthorized\|Error"; then
        log_pass "Wrong password rejected"
    else
        log_fail "Wrong password should be rejected"
    fi
}

test_nonexistent_user() {
    log_info "Test: Non-existent user login should fail"
    if docker login localhost:5000 -u fake-user -p fake-pass 2>&1 | grep -q "unauthorized\|Error"; then
        log_pass "Non-existent user rejected"
    else
        log_fail "Non-existent user should be rejected"
    fi
}

test_correct_login() {
    log_info "Test: Correct credentials login should succeed"
    if docker login localhost:5000 -u team-a -p team-a-secret 2>&1 | grep -q "Succeeded"; then
        log_pass "Correct login succeeded"
    else
        log_fail "Correct login should succeed"
    fi
}

test_own_namespace_push() {
    log_info "Test: Push to own namespace should succeed"
    docker pull alpine:latest >/dev/null 2>&1 || true
    docker tag alpine:latest localhost:5000/team-a/test-image:v1 2>/dev/null
    if docker push localhost:5000/team-a/test-image:v1 2>&1 | grep -q "Pushed\|digest"; then
        log_pass "Push to own namespace succeeded"
    else
        log_fail "Push to own namespace should succeed"
    fi
}

test_own_namespace_pull() {
    log_info "Test: Pull from own namespace should succeed"
    docker rmi localhost:5000/team-a/test-image:v1 2>/dev/null || true
    if docker pull localhost:5000/team-a/test-image:v1 2>&1 | grep -q "Downloaded\|up to date\|Digest"; then
        log_pass "Pull from own namespace succeeded"
    else
        log_fail "Pull from own namespace should succeed"
    fi
}

test_cross_namespace_push() {
    log_info "Test: Push to other namespace should fail"
    docker tag alpine:latest localhost:5000/team-b/hacked:v1 2>/dev/null
    if docker push localhost:5000/team-b/hacked:v1 2>&1 | grep -q "unauthorized\|401\|denied"; then
        log_pass "Cross-namespace push rejected"
    else
        log_fail "Cross-namespace push should be rejected"
    fi
}

test_cross_namespace_pull() {
    log_info "Test: Pull from other namespace should fail"
    # First push as team-b
    docker logout localhost:5000 2>/dev/null || true
    docker login localhost:5000 -u team-b -p team-b-secret >/dev/null 2>&1
    docker tag alpine:latest localhost:5000/team-b/private:v1 2>/dev/null
    docker push localhost:5000/team-b/private:v1 >/dev/null 2>&1 || true

    # Try to pull as team-a
    docker logout localhost:5000 2>/dev/null || true
    docker login localhost:5000 -u team-a -p team-a-secret >/dev/null 2>&1
    if docker pull localhost:5000/team-b/private:v1 2>&1 | grep -q "unauthorized\|401\|denied"; then
        log_pass "Cross-namespace pull rejected"
    else
        log_fail "Cross-namespace pull should be rejected"
    fi
}

# ===========================================
# Admin Test Cases
# ===========================================
test_admin_login() {
    log_info "Test: Admin login should succeed"
    docker logout localhost:5000 2>/dev/null || true
    if docker login localhost:5000 -u admin -p admin-secret 2>&1 | grep -q "Succeeded"; then
        log_pass "Admin login succeeded"
    else
        log_fail "Admin login should succeed"
    fi
}

test_admin_wrong_password() {
    log_info "Test: Admin with wrong password should fail"
    docker logout localhost:5000 2>/dev/null || true
    if docker login localhost:5000 -u admin -p wrong-password 2>&1 | grep -q "unauthorized\|Error"; then
        log_pass "Admin wrong password rejected"
    else
        log_fail "Admin wrong password should be rejected"
    fi
}

test_admin_push_any_namespace() {
    log_info "Test: Admin push to any namespace should succeed"
    docker logout localhost:5000 2>/dev/null || true
    docker login localhost:5000 -u admin -p admin-secret >/dev/null 2>&1
    docker tag alpine:latest localhost:5000/team-b/admin-pushed:v1 2>/dev/null
    if docker push localhost:5000/team-b/admin-pushed:v1 2>&1 | grep -q "Pushed\|digest"; then
        log_pass "Admin push to any namespace succeeded"
    else
        log_fail "Admin push to any namespace should succeed"
    fi
}

test_admin_pull_any_namespace() {
    log_info "Test: Admin pull from any namespace should succeed"
    docker logout localhost:5000 2>/dev/null || true
    docker login localhost:5000 -u admin -p admin-secret >/dev/null 2>&1
    docker rmi localhost:5000/team-a/test-image:v1 2>/dev/null || true
    if docker pull localhost:5000/team-a/test-image:v1 2>&1 | grep -q "Downloaded\|up to date\|Digest"; then
        log_pass "Admin pull from any namespace succeeded"
    else
        log_fail "Admin pull from any namespace should succeed"
    fi
}

# ===========================================
# Cleanup
# ===========================================
cleanup() {
    log_info "Cleaning up..."

    # Logout
    docker logout localhost:5000 2>/dev/null || true

    # Remove test images
    docker rmi localhost:5000/team-a/test-image:v1 2>/dev/null || true
    docker rmi localhost:5000/team-b/hacked:v1 2>/dev/null || true
    docker rmi localhost:5000/team-b/private:v1 2>/dev/null || true
    docker rmi localhost:5000/team-b/admin-pushed:v1 2>/dev/null || true

    # Stop and remove containers + volumes
    docker-compose down -v 2>/dev/null || true

    log_info "Cleanup complete"
}

# ===========================================
# Main
# ===========================================
main() {
    echo "=========================================="
    echo "  rauth Docker Integration Tests"
    echo "=========================================="
    echo ""

    # Trap for cleanup on exit
    trap cleanup EXIT

    setup

    echo ""
    echo "Running security tests..."
    echo ""

    test_unauthenticated_pull
    test_wrong_password
    test_nonexistent_user
    test_correct_login
    test_own_namespace_push
    test_own_namespace_pull
    test_cross_namespace_push
    test_cross_namespace_pull

    echo ""
    echo "Running admin tests..."
    echo ""

    test_admin_login
    test_admin_wrong_password
    test_admin_push_any_namespace
    test_admin_pull_any_namespace

    echo ""
    echo "=========================================="
    echo -e "  Results: ${GREEN}${PASSED} passed${NC}, ${RED}${FAILED} failed${NC}"
    echo "=========================================="

    if [[ $FAILED -gt 0 ]]; then
        exit 1
    fi
}

main "$@"
