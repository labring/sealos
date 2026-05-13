{{/* Expand the name of the chart. */}}
{{- define "cronjob-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Create a default fully qualified app name. */}}
{{- define "cronjob-frontend.fullname" -}}
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

{{- define "cronjob-frontend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "cronjob-frontend.labels" -}}
helm.sh/chart: {{ include "cronjob-frontend.chart" . }}
{{ include "cronjob-frontend.selectorLabels" . }}
{{ include "cronjob-frontend.recommendedLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "cronjob-frontend.selectorLabels" -}}
app: {{ include "cronjob-frontend.fullname" . }}
{{- end }}

{{- define "cronjob-frontend.recommendedLabels" -}}
app.kubernetes.io/name: {{ include "cronjob-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "cronjob-frontend.scheme" -}}
{{- if eq (toString .Values.cronjobConfig.disableHttps) "true" -}}http{{- else -}}https{{- end -}}
{{- end }}

{{- define "cronjob-frontend.port" -}}
{{- $scheme := include "cronjob-frontend.scheme" . -}}
{{- $port := toString .Values.cronjobConfig.cloudPort -}}
{{- if eq $scheme "http" -}}
{{- $port = toString .Values.cronjobConfig.httpPort -}}
{{- end -}}
{{- if or (and (eq $scheme "https") (or (eq $port "") (eq $port "443"))) (and (eq $scheme "http") (or (eq $port "") (eq $port "80"))) -}}
{{- "" -}}
{{- else -}}
{{- $port -}}
{{- end }}
{{- end }}

{{- define "cronjob-frontend.portSuffix" -}}
{{- $port := include "cronjob-frontend.port" . -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "cronjob-frontend.portEnv" -}}
{{- $port := include "cronjob-frontend.port" . -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "cronjob-frontend.cloudOrigin" -}}
{{- include "cronjob-frontend.scheme" . -}}://{{ .Values.cronjobConfig.cloudDomain }}{{ include "cronjob-frontend.portSuffix" . }}
{{- end }}

{{- define "cronjob-frontend.wildcardCloudOrigin" -}}
{{- include "cronjob-frontend.scheme" . -}}://*.{{ .Values.cronjobConfig.cloudDomain }}{{ include "cronjob-frontend.portSuffix" . }}
{{- end }}

{{- define "cronjob-frontend.host" -}}
{{- default (printf "cronjob.%s" .Values.cronjobConfig.cloudDomain) .Values.ingress.host -}}
{{- end }}

{{- define "cronjob-frontend.appUrl" -}}
{{- include "cronjob-frontend.scheme" . -}}://{{ include "cronjob-frontend.host" . }}{{ include "cronjob-frontend.portSuffix" . }}
{{- end }}
