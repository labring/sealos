#!/bin/bash
set -e
projects=$(ls -d deploy/base/*/ | sed 's#deploy/base/##;s#/##')
matrix="{\"include\":["
for project in $projects; do
  versions=$(ls -d deploy/base/$project/*/ | sed "s#deploy/base/$project/##;s#/##")
  for version in $versions; do
    matrix="$matrix{\"project\":\"$project\",\"version\":\"$version\"},"
  done
done
matrix="${matrix%,}]}"
echo "matrix=$matrix"