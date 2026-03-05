#!/bin/bash

arch_list=$1
only_arch=$2
binary_list="sealos,sealctl,lvscare,image-cri-shim"

if [ -z "$arch_list" ]; then
  echo "Please provide a comma-separated list of architectures as an argument"
  exit 1
fi

IFS=',' read -ra arch_array <<< "$arch_list"
output='matrix={"include":['

if [ "$only_arch" == "true" ]; then
  for arch in "${arch_array[@]}"; do
    if [ "$arch" == "arm64" ]; then
      output+="{\"arch\":\"${arch}\",\"runs-on\":\"ubuntu-24.04-arm\"},"
    else
      output+="{\"arch\":\"${arch}\"},"
    fi
  done
else
  IFS=',' read -ra binary_array <<< "$binary_list"
  for arch in "${arch_array[@]}"; do
    for binary in "${binary_array[@]}"; do
      if [ "$arch" == "arm64" ]; then
        output+="{\"binary\":\"${binary}\",\"arch\":\"${arch}\",\"runs-on\":\"ubuntu-24.04-arm\"},"
      else
        output+="{\"binary\":\"${binary}\",\"arch\":\"${arch}\"},"
      fi
    done
  done
fi

output=${output%,}
output+=']}'

set -ex
echo $output >> $GITHUB_OUTPUT
