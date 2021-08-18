<!--
// Copyright © 2019 NAME HERE <EMAIL ADDRESS>
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
-->

# Table of Contents

- [3.3.9-rc.5](#658)
- [3.3.9-rc.3](#658)

# 3.3.9-rc.5

- feat: fix to use calico new version v1.19.1 with new k8s version.  v1.22.0+ ,v1.21.4+,v1.20.10+, v1.19.14.  
other k8s version (v1.21.3-, v1.20.9-, v1.19.13-) to use old calico version v3.8.2. (#658)

# 3.3.9-rc.3 

- hotfix: fix decode cmd miss TokenCaCertHash(#616)
- feat: kubernetes version. like 1.20.0+ , cri use containerd , other use docker-ce. 

...
