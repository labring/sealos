{{/*
Expand the name of the chart.
*/}}
{{- define "costcenter-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "costcenter-frontend.fullname" -}}
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
{{- define "costcenter-frontend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "costcenter-frontend.labels" -}}
helm.sh/chart: {{ include "costcenter-frontend.chart" . }}
{{ include "costcenter-frontend.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "costcenter-frontend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "costcenter-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "costcenter-frontend.scheme" -}}
{{- if eq (toString .Values.costcenterConfig.disableHttps) "true" -}}http{{- else -}}https{{- end -}}
{{- end }}

{{- define "costcenter-frontend.rawPort" -}}
{{- $port := toString .Values.costcenterConfig.cloudPort -}}
{{- if eq (include "costcenter-frontend.scheme" .) "http" -}}
{{- $port = toString .Values.costcenterConfig.httpPort -}}
{{- end -}}
{{- trimPrefix ":" $port -}}
{{- end }}

{{- define "costcenter-frontend.portSuffix" -}}
{{- $scheme := include "costcenter-frontend.scheme" . -}}
{{- $port := include "costcenter-frontend.rawPort" . -}}
{{- if and $port (not (or (and (eq $scheme "https") (eq $port "443")) (and (eq $scheme "http") (eq $port "80")))) -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "costcenter-frontend.host" -}}
{{- default (printf "costcenter.%s" .Values.costcenterConfig.cloudDomain) .Values.ingress.host -}}
{{- end }}

{{- define "costcenter-frontend.url" -}}
{{- include "costcenter-frontend.scheme" . -}}://{{ include "costcenter-frontend.host" . }}{{ include "costcenter-frontend.portSuffix" . }}
{{- end }}
