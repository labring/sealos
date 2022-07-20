# Copyright © 2022 sealos.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

FROM --platform=$BUILDPLATFORM golang:1-bullseye as builder
ARG GITHUB_TOKEN=$GITHUB_TOKEN
ARG TARGETARCH
ARG ACTION=build-pack

WORKDIR /work
COPY . /work
# in china using this
# RUN mv /work/.github/sources.list /etc/apt
RUN dpkg --add-architecture arm64 &&  \
      apt update &&  \
      apt install -y gcc-aarch64-linux-gnu && \
      apt install -y libbtrfs-dev btrfs-tools && \
      apt install -y libgpgme-dev libdevmapper-dev && \
      apt install -y libbtrfs-dev:arm64 btrfs-tools:arm64 && \
      apt install -y libgpgme-dev:arm64 libdevmapper-dev:arm64 && \
      make ${ACTION}
