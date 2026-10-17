{{- define "vlogs.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "vlogs.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 52 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "vlogs.name" .) | trunc 52 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "vlogs.selectorLabels" -}}
app.kubernetes.io/name: {{ include "vlogs.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "vlogs.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | quote }}
{{ include "vlogs.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "vlogs.configSecretName" -}}
{{- default (printf "%s-config" (include "vlogs.fullname" .)) .Values.existingConfigSecret -}}
{{- end -}}
