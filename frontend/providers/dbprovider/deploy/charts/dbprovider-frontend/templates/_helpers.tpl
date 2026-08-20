{{/* Expand the name of the chart. */}}
{{- define "dbprovider-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Create a default fully qualified app name. */}}
{{- define "dbprovider-frontend.fullname" -}}
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

{{- define "dbprovider-frontend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "dbprovider-frontend.labels" -}}
helm.sh/chart: {{ include "dbprovider-frontend.chart" . }}
{{ include "dbprovider-frontend.selectorLabels" . }}
{{ include "dbprovider-frontend.recommendedLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "dbprovider-frontend.selectorLabels" -}}
app: {{ include "dbprovider-frontend.fullname" . }}
{{- end }}

{{- define "dbprovider-frontend.recommendedLabels" -}}
app.kubernetes.io/name: {{ include "dbprovider-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "dbprovider-frontend.scheme" -}}
{{- if eq (toString .Values.dbproviderConfig.disableHttps) "true" -}}http{{- else -}}https{{- end -}}
{{- end }}

{{- define "dbprovider-frontend.port" -}}
{{- $scheme := include "dbprovider-frontend.scheme" . -}}
{{- $port := toString .Values.dbproviderConfig.cloudPort -}}
{{- if eq $scheme "http" -}}
{{- $port = toString .Values.dbproviderConfig.httpPort -}}
{{- end -}}
{{- if or (and (eq $scheme "https") (or (eq $port "") (eq $port "443"))) (and (eq $scheme "http") (or (eq $port "") (eq $port "80"))) -}}
{{- "" -}}
{{- else -}}
{{- $port -}}
{{- end }}
{{- end }}

{{- define "dbprovider-frontend.portSuffix" -}}
{{- $port := include "dbprovider-frontend.port" . -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "dbprovider-frontend.portEnv" -}}
{{- $port := include "dbprovider-frontend.port" . -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "dbprovider-frontend.cloudOrigin" -}}
{{- include "dbprovider-frontend.scheme" . -}}://{{ .Values.dbproviderConfig.cloudDomain }}{{ include "dbprovider-frontend.portSuffix" . }}
{{- end }}

{{- define "dbprovider-frontend.wildcardCloudOrigin" -}}
{{- include "dbprovider-frontend.scheme" . -}}://*.{{ .Values.dbproviderConfig.cloudDomain }}{{ include "dbprovider-frontend.portSuffix" . }}
{{- end }}

{{- define "dbprovider-frontend.host" -}}
{{- default (printf "dbprovider.%s" .Values.dbproviderConfig.cloudDomain) .Values.ingress.host -}}
{{- end }}

{{- define "dbprovider-frontend.appUrl" -}}
{{- include "dbprovider-frontend.scheme" . -}}://{{ include "dbprovider-frontend.host" . }}{{ include "dbprovider-frontend.portSuffix" . }}
{{- end }}
