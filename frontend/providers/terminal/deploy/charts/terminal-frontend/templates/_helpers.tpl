{{/*
Expand the name of the chart.
*/}}
{{- define "terminal-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "terminal-frontend.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "terminal-frontend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "terminal-frontend.labels" -}}
helm.sh/chart: {{ include "terminal-frontend.chart" . }}
{{ include "terminal-frontend.selectorLabels" . }}
{{ include "terminal-frontend.recommendedLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels keep compatibility with the previous manifest selector.
*/}}
{{- define "terminal-frontend.selectorLabels" -}}
app: {{ include "terminal-frontend.fullname" . }}
{{- end }}

{{/*
Recommended Kubernetes labels.
*/}}
{{- define "terminal-frontend.recommendedLabels" -}}
app.kubernetes.io/name: {{ include "terminal-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
HTTP scheme for desktop-facing URLs.
*/}}
{{- define "terminal-frontend.scheme" -}}
{{- if eq (toString .Values.terminalConfig.disableHttps) "true" -}}http{{- else -}}https{{- end -}}
{{- end }}

{{/*
Port without a leading colon, omitting default ports for the selected scheme.
*/}}
{{- define "terminal-frontend.port" -}}
{{- $scheme := include "terminal-frontend.scheme" . -}}
{{- $port := toString .Values.terminalConfig.cloudPort -}}
{{- if eq $scheme "http" -}}
{{- $port = toString .Values.terminalConfig.httpPort -}}
{{- end -}}
{{- if or (and (eq $scheme "https") (eq $port "443")) (and (eq $scheme "http") (eq $port "80")) -}}
{{- "" -}}
{{- else -}}
{{- $port -}}
{{- end -}}
{{- end }}

{{/*
Optional ":port" suffix for desktop-facing URLs.
*/}}
{{- define "terminal-frontend.portSuffix" -}}
{{- $port := include "terminal-frontend.port" . -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "terminal-frontend.cloudOrigin" -}}
{{- include "terminal-frontend.scheme" . -}}://{{ .Values.terminalConfig.cloudDomain }}{{ include "terminal-frontend.portSuffix" . }}
{{- end }}

{{- define "terminal-frontend.wildcardCloudOrigin" -}}
{{- include "terminal-frontend.scheme" . -}}://*.{{ .Values.terminalConfig.cloudDomain }}{{ include "terminal-frontend.portSuffix" . }}
{{- end }}

{{- define "terminal-frontend.terminalUrl" -}}
{{- include "terminal-frontend.scheme" . -}}://terminal.{{ .Values.terminalConfig.cloudDomain }}{{ include "terminal-frontend.portSuffix" . }}
{{- end }}

{{- define "terminal-frontend.host" -}}
{{- default (printf "terminal.%s" .Values.terminalConfig.cloudDomain) .Values.ingress.host -}}
{{- end }}

{{- define "terminal-frontend.ingressName" -}}
{{- default "sealos-terminal" .Values.ingress.name -}}
{{- end }}
