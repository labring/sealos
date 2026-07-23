{{- define "cloudserver-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "cloudserver-frontend.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name (include "cloudserver-frontend.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "cloudserver-frontend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "cloudserver-frontend.selectorLabels" -}}
app: {{ include "cloudserver-frontend.fullname" . }}
{{- end }}

{{- define "cloudserver-frontend.labels" -}}
helm.sh/chart: {{ include "cloudserver-frontend.chart" . }}
{{ include "cloudserver-frontend.selectorLabels" . }}
app.kubernetes.io/name: {{ include "cloudserver-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "cloudserver-frontend.scheme" -}}
{{- if eq (toString .Values.cloudserverConfig.disableHttps) "true" -}}http{{- else -}}https{{- end -}}
{{- end }}

{{- define "cloudserver-frontend.port" -}}
{{- $scheme := include "cloudserver-frontend.scheme" . -}}
{{- $port := trimPrefix ":" (toString .Values.cloudserverConfig.cloudPort) -}}
{{- if eq $scheme "http" -}}{{- $port = trimPrefix ":" (toString .Values.cloudserverConfig.httpPort) -}}{{- end -}}
{{- if or (and (eq $scheme "https") (eq $port "443")) (and (eq $scheme "http") (eq $port "80")) -}}{{- "" -}}{{- else -}}{{- $port -}}{{- end -}}
{{- end }}

{{- define "cloudserver-frontend.portSuffix" -}}
{{- $port := include "cloudserver-frontend.port" . -}}{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "cloudserver-frontend.host" -}}
{{- default (printf "cloudserver.%s" .Values.cloudserverConfig.cloudDomain) .Values.ingress.host -}}
{{- end }}

{{- define "cloudserver-frontend.url" -}}
{{- include "cloudserver-frontend.scheme" . -}}://{{ include "cloudserver-frontend.host" . }}{{ include "cloudserver-frontend.portSuffix" . }}
{{- end }}

{{- define "cloudserver-frontend.cloudOrigin" -}}
{{- include "cloudserver-frontend.scheme" . -}}://{{ .Values.cloudserverConfig.cloudDomain }}{{ include "cloudserver-frontend.portSuffix" . }}
{{- end }}

{{- define "cloudserver-frontend.wildcardCloudOrigin" -}}
{{- include "cloudserver-frontend.scheme" . -}}://*.{{ .Values.cloudserverConfig.cloudDomain }}{{ include "cloudserver-frontend.portSuffix" . }}
{{- end }}
