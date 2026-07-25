{{/*
Expand the name of the chart.
*/}}
{{- define "template-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
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

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "template-frontend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "template-frontend.labels" -}}
helm.sh/chart: {{ include "template-frontend.chart" . }}
{{ include "template-frontend.selectorLabels" . }}
{{ include "template-frontend.recommendedLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels keep compatibility with the previous manifest selector.
*/}}
{{- define "template-frontend.selectorLabels" -}}
app: {{ include "template-frontend.fullname" . }}
{{- end }}

{{/*
Recommended Kubernetes labels.
*/}}
{{- define "template-frontend.recommendedLabels" -}}
app.kubernetes.io/name: {{ include "template-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "template-frontend.portSuffix" -}}
{{- $port := trimPrefix ":" (toString .Values.templateConfig.cloudPort) -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "template-frontend.host" -}}
{{- default (printf "template.%s" .Values.templateConfig.cloudDomain) .Values.ingress.host -}}
{{- end }}

{{- define "template-frontend.url" -}}
https://{{ include "template-frontend.host" . }}{{ include "template-frontend.portSuffix" . }}
{{- end }}
