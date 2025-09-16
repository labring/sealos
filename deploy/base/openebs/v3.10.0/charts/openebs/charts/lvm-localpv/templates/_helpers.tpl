{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "lvmlocalpv.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified localpv provisioner name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "lvmlocalpv.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "lvmlocalpv.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}


{{/*
Create the name of the service account for controller
*/}}
{{- define "lvmlocalpv.lvmController.serviceAccountName" -}}
{{- if .Values.serviceAccount.lvmController.create }}
{{- default (include "lvmlocalpv.fullname" .) .Values.serviceAccount.lvmController.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.lvmController.name }}
{{- end -}}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "lvmlocalpv.lvmNode.serviceAccountName" -}}
{{- if .Values.serviceAccount.lvmNode.create }}
{{- default (include "lvmlocalpv.fullname" .) .Values.serviceAccount.lvmNode.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.lvmNode.name }}
{{- end -}}
{{- end -}}

{{/*
Define meta labels for openebs lvm-localpv components
*/}}
{{- define "lvmlocalpv.common.metaLabels" -}}
chart: {{ template "lvmlocalpv.chart" . }}
heritage: {{ .Release.Service }}
openebs.io/version: {{ .Values.release.version | quote }}
role: {{ .Values.role | quote }}
{{- end -}}

{{/*
Create match labels for openebs lvm-localpv controller
*/}}
{{- define "lvmlocalpv.lvmController.matchLabels" -}}
app: {{ .Values.lvmController.componentName | quote }}
release: {{ .Release.Name }}
component: {{ .Values.lvmController.componentName | quote }}
{{- end -}}

{{/*
Create component labels for lvmlocalpv controller
*/}}
{{- define "lvmlocalpv.lvmController.componentLabels" -}}
openebs.io/component-name: {{ .Values.lvmController.componentName | quote }}
{{- end -}}


{{/*
Create labels for openebs lvm-localpv controller
*/}}
{{- define "lvmlocalpv.lvmController.labels" -}}
{{ include "lvmlocalpv.common.metaLabels" . }}
{{ include "lvmlocalpv.lvmController.matchLabels" . }}
{{ include "lvmlocalpv.lvmController.componentLabels" . }}
{{- end -}}

{{/*
Create match labels for openebs lvm-localpv node daemon
*/}}
{{- define "lvmlocalpv.lvmNode.matchLabels" -}}
name: {{ .Values.lvmNode.componentName | quote }}
release: {{ .Release.Name }}
{{- end -}}

{{/*
Create component labels openebs lvm-localpv node daemon
*/}}
{{- define "lvmlocalpv.lvmNode.componentLabels" -}}
openebs.io/component-name: {{ .Values.lvmNode.componentName | quote }}
{{- end -}}


{{/*
Create labels for openebs lvm-localpv node daemon
*/}}
{{- define "lvmlocalpv.lvmNode.labels" -}}
{{ include "lvmlocalpv.common.metaLabels" . }}
{{ include "lvmlocalpv.lvmNode.matchLabels" . }}
{{ include "lvmlocalpv.lvmNode.componentLabels" . }}
{{- end -}}

{{/*
Create the name of the priority class for csi node plugin
*/}}
{{- define "lvmlocalpv.lvmNode.priorityClassName" -}}
{{- if .Values.lvmNode.priorityClass.create }}
{{- printf "%s-%s" .Release.Name .Values.lvmNode.priorityClass.name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s" .Values.lvmNode.priorityClass.name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Create the name of the priority class for csi controller plugin
*/}}
{{- define "lvmlocalpv.lvmController.priorityClassName" -}}
{{- if .Values.lvmController.priorityClass.create }}
{{- printf "%s-%s" .Release.Name .Values.lvmController.priorityClass.name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s" .Values.lvmController.priorityClass.name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
