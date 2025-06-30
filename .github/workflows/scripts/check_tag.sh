#!/usr/bin/env bash
set -euxo pipefail
# output:
# tagged: true if REF env var starts with `refs/tags/`; false if otherwise
TAGGED=false

if [[ "$REF" == refs/tags/* ]]; then
    TAGGED=true
fi
echo "tagged=$TAGGED" >> "$GITHUB_OUTPUT"
echo "Is the commit tagged: $TAGGED"