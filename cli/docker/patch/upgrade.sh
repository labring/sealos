#!/bin/bash
systemctl stop image-cri-shim
cp cri/image-cri-shim /usr/bin/image-cri-shim
systemctl start image-cri-shim
image-cri-shim -v
