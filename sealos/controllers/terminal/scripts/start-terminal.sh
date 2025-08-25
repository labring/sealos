# Copyright © 2023 sealos.
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

env

kubectl config set-credentials ${USER_NAME} --token=${USER_TOKEN}
kubectl config set-cluster kubernetes --server=${APISERVER} --insecure-skip-tls-verify=true
kubectl config set-context kubernetes \
--cluster=kubernetes \
--user=${USER_NAME} \
--namespace=${NAMESPACE}
kubectl config use-context kubernetes

cat ~/.kube/config

# ttyd -p 8080 bash
ttyd -p 8080 zsh