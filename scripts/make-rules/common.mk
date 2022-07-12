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

SHELL := /bin/bash
DIRS=$(shell ls)
DEBUG ?= 0
GIT_TAG := $(shell git describe --exact-match --tags --abbrev=0  2> /dev/null || echo untagged)
GIT_COMMIT ?= $(shell git rev-parse --short HEAD || echo "0.0.0")
BUILD_DATE=$(shell date +%FT%T%z)

# include the common makefile
COMMON_SELF_DIR := $(dir $(lastword $(MAKEFILE_LIST)))

ifeq ($(origin ROOT_DIR),undefined)
ROOT_DIR := $(abspath $(shell cd $(COMMON_SELF_DIR)/../.. && pwd -P))
endif
ifeq ($(origin OUTPUT_DIR),undefined)
OUTPUT_DIR := $(ROOT_DIR)/dist
$(shell mkdir -p $(OUTPUT_DIR))
endif
ifeq ($(origin BIN_DIR),undefined)
BIN_DIR := $(ROOT_DIR)/bin
$(shell mkdir -p $(BIN_DIR))
endif
ifeq ($(origin TOOLS_DIR),undefined)
TOOLS_DIR := $(ROOT_DIR)/tools
$(shell mkdir -p $(TOOLS_DIR))
endif
ifeq ($(origin TMP_DIR),undefined)
TMP_DIR := $(ROOT_DIR)/tmp
$(shell mkdir -p $(TMP_DIR))
endif

ifeq ($(origin VERSION), undefined)
VERSION := $(shell git describe --abbrev=0 --dirty --always --tags | sed 's/-/./g')
endif

PLATFORMS ?= linux_arm64 linux_amd64

# only support linux
GOOS=linux
# set a specific PLATFORM, defaults to the host platform
ifeq ($(origin PLATFORM), undefined)
	ifeq ($(origin GOARCH), undefined)
		GOARCH := $(shell go env GOARCH)
	endif
	PLATFORM := $(GOOS)_$(GOARCH)
endif

# Linux command settings
CODE_DIRS := $(ROOT_DIR)/pkg $(ROOT_DIR)/cmd $(ROOT_DIR)/test $(ROOT_DIR)/staging
FIND := find $(CODE_DIRS)

# verbose settings
ifndef V
MAKEFLAGS += --no-print-directory
endif

COMMA := ,
SPACE :=
SPACE +=
