{{- define "invite-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "invite-frontend.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name (include "invite-frontend.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "invite-frontend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "invite-frontend.selectorLabels" -}}
app: {{ include "invite-frontend.fullname" . }}
{{- end }}

{{- define "invite-frontend.labels" -}}
helm.sh/chart: {{ include "invite-frontend.chart" . }}
{{ include "invite-frontend.selectorLabels" . }}
app.kubernetes.io/name: {{ include "invite-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "invite-frontend.scheme" -}}
{{- if eq (toString .Values.inviteConfig.disableHttps) "true" -}}http{{- else -}}https{{- end -}}
{{- end }}

{{- define "invite-frontend.port" -}}
{{- $scheme := include "invite-frontend.scheme" . -}}
{{- $port := trimPrefix ":" (toString .Values.inviteConfig.cloudPort) -}}
{{- if eq $scheme "http" -}}{{- $port = trimPrefix ":" (toString .Values.inviteConfig.httpPort) -}}{{- end -}}
{{- if or (and (eq $scheme "https") (eq $port "443")) (and (eq $scheme "http") (eq $port "80")) -}}{{- "" -}}{{- else -}}{{- $port -}}{{- end -}}
{{- end }}

{{- define "invite-frontend.portSuffix" -}}
{{- $port := include "invite-frontend.port" . -}}{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "invite-frontend.host" -}}
{{- default (printf "invite.%s" .Values.inviteConfig.cloudDomain) .Values.ingress.host -}}
{{- end }}

{{- define "invite-frontend.url" -}}
{{- include "invite-frontend.scheme" . -}}://{{ include "invite-frontend.host" . }}{{ include "invite-frontend.portSuffix" . }}
{{- end }}

{{- define "invite-frontend.cloudOrigin" -}}
{{- include "invite-frontend.scheme" . -}}://{{ .Values.inviteConfig.cloudDomain }}{{ include "invite-frontend.portSuffix" . }}
{{- end }}

{{- define "invite-frontend.wildcardCloudOrigin" -}}
{{- include "invite-frontend.scheme" . -}}://*.{{ .Values.inviteConfig.cloudDomain }}{{ include "invite-frontend.portSuffix" . }}
{{- end }}
