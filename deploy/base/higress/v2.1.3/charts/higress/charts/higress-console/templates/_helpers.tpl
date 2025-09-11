{{/*
Expand the name of the chart.
*/}}
{{- define "higress-console.name" -}}
{{- default .Chart.Name .Values.name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "higress-console.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "higress-console.labels" -}}
helm.sh/chart: {{ include "higress-console.chart" . }}
{{ include "higress-console.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "higress-console.selectorLabels" -}}
app.kubernetes.io/name: {{ include "higress-console.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "higress-console.controller.jwtPolicy" -}}
{{- if semverCompare ">=1.21-0" .Capabilities.KubeVersion.GitVersion }}
{{- .Values.global.jwtPolicy | default "third-party-jwt" }}
{{- else }}
{{- print "first-party-jwt" }}
{{- end }}
{{- end }}

{{/*
Admin Password
*/}}
{{- define "higress-console.adminPassword" -}}
app.kubernetes.io/name: {{ include "higress-console.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create a default fully qualified app name for Grafana.
*/}}
{{- define "higress-console-grafana.name" -}}
{{- $consoleName := include "higress-console.name" . }}
{{- printf "%s-grafana" ($consoleName | trunc 55) }}
{{- end }}

{{- define "higress-console-grafana.path" -}}
/grafana
{{- end }}

{{/*
Create a default fully qualified app name for Prometheus.
*/}}
{{- define "higress-console-prometheus.name" -}}
{{- $consoleName := include "higress-console.name" . }}
{{- printf "%s-prometheus" ($consoleName | trunc 52) }}
{{- end }}

{{- define "higress-console-prometheus.path" -}}
/prometheus
{{- end }}

{{/*
Create a default fully qualified app name for cert-manager
*/}}
{{- define "higress-console-cert-manager.name" -}}
{{- $consoleName := include "higress-console.name" . }}
{{- printf "%s-cert-manager" ($consoleName | trunc 52) }}
{{- end }}

{{/*
Create a default fully qualified app name for promtail
*/}}
{{- define "higress-console-promtail.name" -}}
{{- $consoleName := include "higress-console.name" . }}
{{- printf "%s-promtail" ($consoleName | trunc 52) }}
{{- end }}

{{/*
Create a default fully qualified app name for loki
*/}}
{{- define "higress-console-loki.name" -}}
{{- $consoleName := include "higress-console.name" . }}
{{- printf "%s-loki" ($consoleName | trunc 52) }}
{{- end }}
