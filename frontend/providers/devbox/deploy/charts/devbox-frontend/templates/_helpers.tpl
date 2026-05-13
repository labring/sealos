{{/* Expand the name of the chart. */}}
{{- define "devbox-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Create a default fully qualified app name. */}}
{{- define "devbox-frontend.fullname" -}}
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

{{- define "devbox-frontend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "devbox-frontend.labels" -}}
helm.sh/chart: {{ include "devbox-frontend.chart" . }}
{{ include "devbox-frontend.selectorLabels" . }}
{{ include "devbox-frontend.recommendedLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "devbox-frontend.selectorLabels" -}}
app: {{ include "devbox-frontend.fullname" . }}
{{- end }}

{{- define "devbox-frontend.recommendedLabels" -}}
app.kubernetes.io/name: {{ include "devbox-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "devbox-frontend.scheme" -}}
{{- if eq (toString .Values.devboxConfig.disableHttps) "true" -}}http{{- else -}}https{{- end -}}
{{- end }}

{{- define "devbox-frontend.port" -}}
{{- $scheme := include "devbox-frontend.scheme" . -}}
{{- $port := toString .Values.devboxConfig.cloudPort -}}
{{- if eq $scheme "http" -}}
{{- $port = toString .Values.devboxConfig.httpPort -}}
{{- end -}}
{{- if or (and (eq $scheme "https") (or (eq $port "") (eq $port "443"))) (and (eq $scheme "http") (or (eq $port "") (eq $port "80"))) -}}
{{- "" -}}
{{- else -}}
{{- $port -}}
{{- end }}
{{- end }}

{{- define "devbox-frontend.portSuffix" -}}
{{- $port := include "devbox-frontend.port" . -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "devbox-frontend.portEnv" -}}
{{- $port := include "devbox-frontend.port" . -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "devbox-frontend.cloudOrigin" -}}
{{- include "devbox-frontend.scheme" . -}}://{{ .Values.devboxConfig.cloudDomain }}{{ include "devbox-frontend.portSuffix" . }}
{{- end }}

{{- define "devbox-frontend.wildcardCloudOrigin" -}}
{{- include "devbox-frontend.scheme" . -}}://*.{{ .Values.devboxConfig.cloudDomain }}{{ include "devbox-frontend.portSuffix" . }}
{{- end }}

{{- define "devbox-frontend.host" -}}
{{- default (printf "devbox.%s" .Values.devboxConfig.cloudDomain) .Values.ingress.host -}}
{{- end }}

{{- define "devbox-frontend.appUrl" -}}
{{- include "devbox-frontend.scheme" . -}}://{{ include "devbox-frontend.host" . }}{{ include "devbox-frontend.portSuffix" . }}
{{- end }}
