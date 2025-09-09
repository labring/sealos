#!/bin/bash
set -e

while true; do
    # shellcheck disable=SC2126
    NOT_RUNNING=$(kubectl get pods -n devbox-frontend --no-headers | grep prisma-migrate-deploy | grep -v "Completed" | wc -l)
    if [[ $NOT_RUNNING -eq 0 ]]; then
        echo "All pods are in Completed state for prisma-migrate-deploy !"
        break
    else
        echo "Waiting for pods to be in Completed state for prisma-migrate-deploy..."
        sleep 2
    fi
done