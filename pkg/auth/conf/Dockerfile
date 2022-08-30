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

FROM bitnami/git as git

WORKDIR /
RUN git clone https://github.com/casbin/static.git

FROM nginx:stable

WORKDIR /home
COPY --from=git /static/ /home/static/
RUN echo "server { \
    listen 80; \
    server_name localhost; \
    location / { \
        root /home/static; \
    }\
    }" > /etc/nginx/conf.d/default.conf