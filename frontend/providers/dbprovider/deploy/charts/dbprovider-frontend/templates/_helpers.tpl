{{/*
Expand the name of the chart.
*/}}
{{- define "dbprovider-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
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

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "dbprovider-frontend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "dbprovider-frontend.labels" -}}
helm.sh/chart: {{ include "dbprovider-frontend.chart" . }}
{{ include "dbprovider-frontend.selectorLabels" . }}
{{ include "dbprovider-frontend.recommendedLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels keep compatibility with the previous manifest selector.
*/}}
{{- define "dbprovider-frontend.selectorLabels" -}}
app: {{ include "dbprovider-frontend.fullname" . }}
{{- end }}

{{/*
Recommended Kubernetes labels.
*/}}
{{- define "dbprovider-frontend.recommendedLabels" -}}
app.kubernetes.io/name: {{ include "dbprovider-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "dbprovider-frontend.portSuffix" -}}
{{- $port := trimPrefix ":" (toString .Values.dbproviderConfig.cloudPort) -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "dbprovider-frontend.host" -}}
{{- default (printf "dbprovider.%s" .Values.dbproviderConfig.cloudDomain) .Values.ingress.host -}}
{{- end }}

{{- define "dbprovider-frontend.url" -}}
https://{{ include "dbprovider-frontend.host" . }}{{ include "dbprovider-frontend.portSuffix" . }}
{{- end }}
