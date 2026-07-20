{{- define "kubepanel-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "kubepanel-frontend.fullname" -}}
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

{{- define "kubepanel-frontend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "kubepanel-frontend.selectorLabels" -}}
app: {{ include "kubepanel-frontend.fullname" . }}
{{- end }}

{{- define "kubepanel-frontend.labels" -}}
helm.sh/chart: {{ include "kubepanel-frontend.chart" . }}
{{ include "kubepanel-frontend.selectorLabels" . }}
app.kubernetes.io/name: {{ include "kubepanel-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- end }}

{{- define "kubepanel-frontend.scheme" -}}
{{- if eq (toString .Values.kubepanelConfig.disableHttps) "true" -}}http{{- else -}}https{{- end -}}
{{- end }}

{{- define "kubepanel-frontend.port" -}}
{{- $scheme := include "kubepanel-frontend.scheme" . -}}
{{- $port := toString .Values.kubepanelConfig.cloudPort -}}
{{- if eq $scheme "http" -}}
{{- $port = toString .Values.kubepanelConfig.httpPort -}}
{{- end -}}
{{- if or (and (eq $scheme "https") (eq $port "443")) (and (eq $scheme "http") (eq $port "80")) -}}
{{- "" -}}
{{- else -}}
{{- $port -}}
{{- end -}}
{{- end }}

{{- define "kubepanel-frontend.portSuffix" -}}
{{- $port := include "kubepanel-frontend.port" . -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "kubepanel-frontend.sealosPort" -}}
{{- $port := toString .Values.kubepanelConfig.cloudPort -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "kubepanel-frontend.host" -}}
{{- default (printf "kubepanel.%s" .Values.kubepanelConfig.cloudDomain) .Values.ingress.host -}}
{{- end }}

{{- define "kubepanel-frontend.url" -}}
{{- include "kubepanel-frontend.scheme" . -}}://{{ include "kubepanel-frontend.host" . }}{{ include "kubepanel-frontend.portSuffix" . }}
{{- end }}

{{- define "kubepanel-frontend.cloudOrigin" -}}
{{- include "kubepanel-frontend.scheme" . -}}://{{ .Values.kubepanelConfig.cloudDomain }}{{ include "kubepanel-frontend.portSuffix" . }}
{{- end }}

{{- define "kubepanel-frontend.wildcardCloudOrigin" -}}
{{- include "kubepanel-frontend.scheme" . -}}://*.{{ .Values.kubepanelConfig.cloudDomain }}{{ include "kubepanel-frontend.portSuffix" . }}
{{- end }}
