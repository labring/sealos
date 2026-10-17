{{- define "stargz-webhook.name" -}}stargz-webhook{{- end }}

{{- define "stargz-webhook.fullname" -}}{{ .Values.deploymentName }}{{- end }}

{{- define "stargz-webhook.labels" -}}
app.kubernetes.io/name: {{ include "stargz-webhook.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: Helm
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{- define "stargz-webhook.selectorLabels" -}}
{{- toYaml .Values.selectorLabels }}
{{- end }}
