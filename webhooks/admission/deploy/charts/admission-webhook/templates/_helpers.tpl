{{- define "admission-webhook.name" -}}admission-webhook{{- end }}

{{- define "admission-webhook.labels" -}}
app.kubernetes.io/name: {{ include "admission-webhook.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: Helm
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
sealos.io/component: admission-controller-manager
{{- end }}

{{- define "admission-webhook.selectorLabels" -}}
control-plane: controller-manager
sealos.io/component: admission-controller-manager
{{- end }}
