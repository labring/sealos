{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "zfslocalpv.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified localpv provisioner name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "zfslocalpv.fullname" -}}
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
{{- define "zfslocalpv.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}


{{/*
Create the name of the service account for controller
*/}}
{{- define "zfslocalpv.zfsController.serviceAccountName" -}}
{{- if .Values.serviceAccount.zfsController.create }}
{{- default (include "zfslocalpv.fullname" .) .Values.serviceAccount.zfsController.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.zfsController.name }}
{{- end -}}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "zfslocalpv.zfsNode.serviceAccountName" -}}
{{- if .Values.serviceAccount.zfsNode.create }}
{{- default (include "zfslocalpv.fullname" .) .Values.serviceAccount.zfsNode.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.zfsNode.name }}
{{- end -}}
{{- end -}}

{{/*
Define meta labels for openebs zfs-localpv components
*/}}
{{- define "zfslocalpv.common.metaLabels" -}}
chart: {{ template "zfslocalpv.chart" . }}
heritage: {{ .Release.Service }}
openebs.io/version: {{ .Values.release.version | quote }}
role: {{ .Values.role | quote }}
{{- end -}}

{{/*
Create match labels for openebs zfs-localpv controller
*/}}
{{- define "zfslocalpv.zfsController.matchLabels" -}}
app: {{ .Values.zfsController.componentName | quote }}
release: {{ .Release.Name }}
component: {{ .Values.zfsController.componentName | quote }}
{{- end -}}

{{/*
Create component labels for zfslocalpv controller
*/}}
{{- define "zfslocalpv.zfsController.componentLabels" -}}
openebs.io/component-name: {{ .Values.zfsController.componentName | quote }}
{{- end -}}


{{/*
Create labels for openebs zfs-localpv controller
*/}}
{{- define "zfslocalpv.zfsController.labels" -}}
{{ include "zfslocalpv.common.metaLabels" . }}
{{ include "zfslocalpv.zfsController.matchLabels" . }}
{{ include "zfslocalpv.zfsController.componentLabels" . }}
{{- end -}}

{{/*
Create match labels for openebs zfs-localpv node daemon
*/}}
{{- define "zfslocalpv.zfsNode.matchLabels" -}}
name: {{ .Values.zfsNode.componentName | quote }}
release: {{ .Release.Name }}
{{- end -}}

{{/*
Create component labels openebs zfs-localpv node daemon
*/}}
{{- define "zfslocalpv.zfsNode.componentLabels" -}}
openebs.io/component-name: {{ .Values.zfsNode.componentName | quote }}
{{- end -}}


{{/*
Create labels for openebs zfs-localpv node daemon
*/}}
{{- define "zfslocalpv.zfsNode.labels" -}}
{{ include "zfslocalpv.common.metaLabels" . }}
{{ include "zfslocalpv.zfsNode.matchLabels" . }}
{{ include "zfslocalpv.zfsNode.componentLabels" . }}
{{- end -}}

{{/*
Create the name of the priority class for csi node plugin
*/}}
{{- define "zfslocalpv.zfsNode.priorityClassName" -}}
{{- if .Values.zfsNode.priorityClass.create }}
{{- printf "%s-%s" .Release.Name .Values.zfsNode.priorityClass.name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s" .Values.zfsNode.priorityClass.name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Create the name of the priority class for csi controller plugin
*/}}
{{- define "zfslocalpv.zfsController.priorityClassName" -}}
{{- if .Values.zfsController.priorityClass.create }}
{{- printf "%s-%s" .Release.Name .Values.zfsController.priorityClass.name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s" .Values.zfsController.priorityClass.name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
