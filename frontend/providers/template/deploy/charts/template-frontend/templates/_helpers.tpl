{{/* Expand the name of the chart. */}}
{{- define "template-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Create a default fully qualified app name. */}}
{{- define "template-frontend.fullname" -}}
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

{{- define "template-frontend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "template-frontend.labels" -}}
helm.sh/chart: {{ include "template-frontend.chart" . }}
{{ include "template-frontend.selectorLabels" . }}
{{ include "template-frontend.recommendedLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "template-frontend.selectorLabels" -}}
app: {{ include "template-frontend.fullname" . }}
{{- end }}

{{- define "template-frontend.recommendedLabels" -}}
app.kubernetes.io/name: {{ include "template-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "template-frontend.scheme" -}}
{{- if eq (toString .Values.templateConfig.disableHttps) "true" -}}http{{- else -}}https{{- end -}}
{{- end }}

{{- define "template-frontend.port" -}}
{{- $scheme := include "template-frontend.scheme" . -}}
{{- $port := toString .Values.templateConfig.cloudPort -}}
{{- if eq $scheme "http" -}}
{{- $port = toString .Values.templateConfig.httpPort -}}
{{- end -}}
{{- if or (and (eq $scheme "https") (or (eq $port "") (eq $port "443"))) (and (eq $scheme "http") (or (eq $port "") (eq $port "80"))) -}}
{{- "" -}}
{{- else -}}
{{- $port -}}
{{- end }}
{{- end }}

{{- define "template-frontend.portSuffix" -}}
{{- $port := include "template-frontend.port" . -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "template-frontend.portEnv" -}}
{{- $port := include "template-frontend.port" . -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "template-frontend.cloudOrigin" -}}
{{- include "template-frontend.scheme" . -}}://{{ .Values.templateConfig.cloudDomain }}{{ include "template-frontend.portSuffix" . }}
{{- end }}

{{- define "template-frontend.wildcardCloudOrigin" -}}
{{- include "template-frontend.scheme" . -}}://*.{{ .Values.templateConfig.cloudDomain }}{{ include "template-frontend.portSuffix" . }}
{{- end }}

{{- define "template-frontend.host" -}}
{{- default (printf "template.%s" .Values.templateConfig.cloudDomain) .Values.ingress.host -}}
{{- end }}

{{- define "template-frontend.appUrl" -}}
{{- include "template-frontend.scheme" . -}}://{{ include "template-frontend.host" . }}{{ include "template-frontend.portSuffix" . }}
{{- end }}
