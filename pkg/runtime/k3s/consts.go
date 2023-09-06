// Copyright © 2023 sealos.
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

package k3s

const Distribution = "k3s"

const (
	defaultBinDir              = "/usr/local/bin"
	defaultConfigPath          = "/etc/rancher/k3s/config.yaml"
	defaultRootFsK3sFileName   = "k3s.yaml"
	defaultInitFilename        = "k3s-init.yaml"
	defaultJoinMastersFilename = "k3s-join-master.yaml"
	defaultJoinNodesFilename   = "k3s-join-master.yaml"
)

var defaultSymlinks = []string{"kubectl", "crictl", "ctr"}

const (
	serverMode = "server"
	agentMode  = "agent"
)

type serviceType int

const (
	openRC serviceType = iota
	systemd
)

const systemdTpl = `
[Unit]
Description=Lightweight Kubernetes
Documentation=https://k3s.io
Wants=network-online.target
After=network-online.target

[Install]
WantedBy=multi-user.target

[Service]
Type=notify
EnvironmentFile=-/etc/default/%N
EnvironmentFile=-/etc/sysconfig/%N
EnvironmentFile=-{{ .envFile }}
KillMode=process
Delegate=yes
# Having non-zero Limit*s causes performance problems due to accounting overhead
# in the kernel. We recommend using cgroups to do container-local accounting.
LimitNOFILE=1048576
LimitNPROC=infinity
LimitCORE=infinity
TasksMax=infinity
TimeoutStartSec=0
Restart=always
RestartSec=5s
ExecStartPre=/bin/sh -xc '! /usr/bin/systemctl is-enabled --quiet nm-cloud-setup.service'
ExecStartPre=-/sbin/modprobe br_netfilter
ExecStartPre=-/sbin/modprobe overlay
ExecStart={{ .binDir }}/k3s {{ .exec }}
`

const openRCTpl = `
#!/sbin/openrc-run

LOG_FILE=/var/log/k3s.log

depend() {
    after network-online
    want cgroups
}

start_pre() {
    rm -f /tmp/k3s.*
}

supervisor=supervise-daemon
name=k3s
command="{{ .binDir }}/k3s"
command_args={{ .exec }}

output_log=${LOG_FILE}
error_log=${LOG_FILE}

pidfile="/var/run/k3s.pid"
respawn_delay=5
respawn_max=0

set -o allexport
if [ -f /etc/environment ]; then . /etc/environment; fi
if [ -f {{ .envFile }} ]; then . {{ .envFile }}; fi
set +o allexport
`
