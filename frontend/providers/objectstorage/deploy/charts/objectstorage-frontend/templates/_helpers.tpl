{{- define "objectstorage-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "objectstorage-frontend.fullname" -}}
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

{{- define "objectstorage-frontend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "objectstorage-frontend.selectorLabels" -}}
app: {{ include "objectstorage-frontend.fullname" . }}
{{- end }}

{{- define "objectstorage-frontend.labels" -}}
helm.sh/chart: {{ include "objectstorage-frontend.chart" . }}
{{ include "objectstorage-frontend.selectorLabels" . }}
app.kubernetes.io/name: {{ include "objectstorage-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- end }}

{{- define "objectstorage-frontend.scheme" -}}
{{- if eq (toString .Values.objectstorageConfig.disableHttps) "true" -}}http{{- else -}}https{{- end -}}
{{- end }}

{{- define "objectstorage-frontend.port" -}}
{{- $scheme := include "objectstorage-frontend.scheme" . -}}
{{- $port := toString .Values.objectstorageConfig.cloudPort -}}
{{- if eq $scheme "http" -}}
{{- $port = toString .Values.objectstorageConfig.httpPort -}}
{{- end -}}
{{- if or (and (eq $scheme "https") (eq $port "443")) (and (eq $scheme "http") (eq $port "80")) -}}
{{- "" -}}
{{- else -}}
{{- $port -}}
{{- end -}}
{{- end }}

{{- define "objectstorage-frontend.portSuffix" -}}
{{- $port := include "objectstorage-frontend.port" . -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "objectstorage-frontend.host" -}}
{{- default (printf "objectstorage.%s" .Values.objectstorageConfig.cloudDomain) .Values.ingress.host -}}
{{- end }}

{{- define "objectstorage-frontend.url" -}}
{{- include "objectstorage-frontend.scheme" . -}}://{{ include "objectstorage-frontend.host" . }}{{ include "objectstorage-frontend.portSuffix" . }}
{{- end }}
