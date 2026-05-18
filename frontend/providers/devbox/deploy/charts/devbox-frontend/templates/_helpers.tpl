{{/*
Expand the name of the chart.
*/}}
{{- define "devbox-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
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

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "devbox-frontend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "devbox-frontend.labels" -}}
helm.sh/chart: {{ include "devbox-frontend.chart" . }}
{{ include "devbox-frontend.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "devbox-frontend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "devbox-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
External hostname without scheme.
*/}}
{{- define "devbox-frontend.externalHost" -}}
{{- $host := .Values.ingress.host | default (printf "devbox.%s" .Values.devboxConfig.cloudDomain) -}}
{{- $port := toString .Values.devboxConfig.cloudPort -}}
{{- if and $port (ne $port "") -}}
{{- printf "%s:%s" $host $port -}}
{{- else -}}
{{- $host -}}
{{- end -}}
{{- end }}
