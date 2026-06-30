{{/*
Expand the name of the chart.
*/}}
{{- define "applaunchpad-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "applaunchpad-frontend.fullname" -}}
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
{{- define "applaunchpad-frontend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "applaunchpad-frontend.labels" -}}
helm.sh/chart: {{ include "applaunchpad-frontend.chart" . }}
{{ include "applaunchpad-frontend.selectorLabels" . }}
{{ include "applaunchpad-frontend.recommendedLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels keep compatibility with the previous manifest selector.
*/}}
{{- define "applaunchpad-frontend.selectorLabels" -}}
app: {{ include "applaunchpad-frontend.fullname" . }}
{{- end }}

{{/*
Recommended Kubernetes labels.
*/}}
{{- define "applaunchpad-frontend.recommendedLabels" -}}
app.kubernetes.io/name: {{ include "applaunchpad-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use.
*/}}
{{- define "applaunchpad-frontend.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "applaunchpad-frontend.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "applaunchpad-frontend.scheme" -}}
{{- if eq (toString .Values.applaunchpadConfig.disableHttps) "true" -}}http{{- else -}}https{{- end -}}
{{- end }}

{{- define "applaunchpad-frontend.rawPort" -}}
{{- $scheme := include "applaunchpad-frontend.scheme" . -}}
{{- $port := toString .Values.applaunchpadConfig.cloudPort -}}
{{- if eq $scheme "http" -}}
{{- $port = toString .Values.applaunchpadConfig.httpPort -}}
{{- end -}}
{{- trimPrefix ":" $port -}}
{{- end }}

{{- define "applaunchpad-frontend.port" -}}
{{- $scheme := include "applaunchpad-frontend.scheme" . -}}
{{- $port := include "applaunchpad-frontend.rawPort" . -}}
{{- if or (and (eq $scheme "https") (eq $port "443")) (and (eq $scheme "http") (eq $port "80")) -}}
{{- "" -}}
{{- else -}}
{{- $port -}}
{{- end -}}
{{- end }}

{{- define "applaunchpad-frontend.portSuffix" -}}
{{- $port := include "applaunchpad-frontend.port" . -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "applaunchpad-frontend.releaseConfigPort" -}}
{{- $port := trimPrefix ":" (toString .Values.applaunchpadConfig.cloudPort) -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "applaunchpad-frontend.releaseConfigHTTPPort" -}}
{{- $port := trimPrefix ":" (toString .Values.applaunchpadConfig.httpPort) -}}
{{- if $port -}}:{{ $port }}{{- end -}}
{{- end }}

{{- define "applaunchpad-frontend.cloudOrigin" -}}
{{- include "applaunchpad-frontend.scheme" . -}}://{{ .Values.applaunchpadConfig.cloudDomain }}{{ include "applaunchpad-frontend.portSuffix" . }}
{{- end }}

{{- define "applaunchpad-frontend.wildcardCloudOrigin" -}}
{{- include "applaunchpad-frontend.scheme" . -}}://*.{{ .Values.applaunchpadConfig.cloudDomain }}{{ include "applaunchpad-frontend.portSuffix" . }}
{{- end }}

{{- define "applaunchpad-frontend.host" -}}
{{- default (printf "applaunchpad.%s" .Values.applaunchpadConfig.cloudDomain) .Values.ingress.host -}}
{{- end }}

{{- define "applaunchpad-frontend.url" -}}
{{- include "applaunchpad-frontend.scheme" . -}}://{{ include "applaunchpad-frontend.host" . }}{{ include "applaunchpad-frontend.portSuffix" . }}
{{- end }}
