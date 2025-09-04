{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "jiva.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "jiva.fullname" -}}
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
{{- define "jiva.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "jiva.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "jiva.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Define meta labels for jiva components
*/}}
{{- define "jiva.common.metaLabels" -}}
chart: {{ template "jiva.chart" . }}
heritage: {{ .Release.Service }}
openebs.io/version: {{ .Values.release.version | quote }}
{{- end -}}

{{/*
Create match labels for jiva operator
*/}}
{{- define "jiva.operator.matchLabels" -}}
name: {{ .Values.jivaOperator.componentName | quote }}
release: {{ .Release.Name }}
component: {{ .Values.jivaOperator.componentName | quote }}
{{- end -}}

{{/*
Create component labels jiva operator
*/}}
{{- define "jiva.operator.componentLabels" -}}
openebs.io/component-name: {{ .Values.jivaOperator.componentName | quote }}
{{- end -}}


{{/*
Create labels for jiva operator
*/}}
{{- define "jiva.operator.labels" -}}
{{ include "jiva.common.metaLabels" . }}
{{ include "jiva.operator.matchLabels" . }}
{{ include "jiva.operator.componentLabels" . }}
{{- end -}}

{{/*
Create match labels for jiva csi node operator
*/}}
{{- define "jiva.csiNode.matchLabels" -}}
name: {{ .Values.csiNode.componentName | quote }}
release: {{ .Release.Name }}
component: {{ .Values.csiNode.componentName | quote }}
{{- end -}}

{{/*
Create component labels jiva csi node operator
*/}}
{{- define "jiva.csiNode.componentLabels" -}}
openebs.io/component-name: {{ .Values.csiNode.componentName | quote }}
{{- end -}}

{{/*
Create labels for jiva csi node operator
*/}}
{{- define "jiva.csiNode.labels" -}}
{{ include "jiva.common.metaLabels" . }}
{{ include "jiva.csiNode.matchLabels" . }}
{{ include "jiva.csiNode.componentLabels" . }}
{{- end -}}

{{/*
Create match labels for jiva csi controller
*/}}
{{- define "jiva.csiController.matchLabels" -}}
name: {{ .Values.csiController.componentName | quote }}
release: {{ .Release.Name }}
component: {{ .Values.csiController.componentName | quote }}
{{- end -}}

{{/*
Create component labels jiva csi controller
*/}}
{{- define "jiva.csiController.componentLabels" -}}
openebs.io/component-name: {{ .Values.csiController.componentName | quote }}
{{- end -}}

{{/*
Create labels for jiva csi controller
*/}}
{{- define "jiva.csiController.labels" -}}
{{ include "jiva.common.metaLabels" . }}
{{ include "jiva.csiController.matchLabels" . }}
{{ include "jiva.csiController.componentLabels" . }}
{{- end -}}

{{/*
Create the name of the priority class for csi node plugin
*/}}
{{- define "jiva.csiNode.priorityClassName" -}}
{{- if .Values.csiNode.priorityClass.create }}
{{- printf "%s-%s" .Release.Name .Values.csiNode.priorityClass.name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s" .Values.csiNode.priorityClass.name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Create the name of the priority class for csi controller plugin
*/}}
{{- define "jiva.csiController.priorityClassName" -}}
{{- if .Values.csiController.priorityClass.create }}
{{- printf "%s-%s" .Release.Name .Values.csiController.priorityClass.name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s" .Values.csiController.priorityClass.name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
