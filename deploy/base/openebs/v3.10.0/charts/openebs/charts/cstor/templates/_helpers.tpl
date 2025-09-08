{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "cstor.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "cstor.fullname" -}}
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
{{- define "cstor.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "cstor.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "cstor.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Define meta labels for cstor components
*/}}
{{- define "cstor.common.metaLabels" -}}
chart: {{ template "cstor.chart" . }}
heritage: {{ .Release.Service }}
openebs.io/version: {{ .Values.release.version | quote }}
{{- end -}}

{{/*
Create match labels for cstor admission server
*/}}
{{- define "cstor.admissionServer.matchLabels" -}}
app: {{ .Values.admissionServer.componentName | quote }}
release: {{ .Release.Name }}
component: {{ .Values.admissionServer.componentName | quote }}
{{- end -}}

{{/*
Create component labels for cstor admission server
*/}}
{{- define "cstor.admissionServer.componentLabels" -}}
openebs.io/component-name: {{ .Values.admissionServer.componentName | quote }}
{{- end -}}

{{/*
Create labels for cstor admission server
*/}}
{{- define "cstor.admissionServer.labels" -}}
{{ include "cstor.common.metaLabels" . }}
{{ include "cstor.admissionServer.matchLabels" . }}
{{ include "cstor.admissionServer.componentLabels" . }}
{{- end -}}

{{/*
Create match labels for cstor cspc operator
*/}}
{{- define "cstor.cspcOperator.matchLabels" -}}
name: {{ .Values.cspcOperator.componentName | quote }}
release: {{ .Release.Name }}
component: {{ .Values.cspcOperator.componentName | quote }}
{{- end -}}

{{/*
Create component labels cstor cspc operator
*/}}
{{- define "cstor.cspcOperator.componentLabels" -}}
openebs.io/component-name: {{ .Values.cspcOperator.componentName | quote }}
{{- end -}}


{{/*
Create labels for cstor cspc operator
*/}}
{{- define "cstor.cspcOperator.labels" -}}
{{ include "cstor.common.metaLabels" . }}
{{ include "cstor.cspcOperator.matchLabels" . }}
{{ include "cstor.cspcOperator.componentLabels" . }}
{{- end -}}

{{/*
Create match labels for cstor cvc operator
*/}}
{{- define "cstor.cvcOperator.matchLabels" -}}
name: {{ .Values.cvcOperator.componentName | quote }}
release: {{ .Release.Name }}
component: {{ .Values.cvcOperator.componentName | quote }}
{{- end -}}

{{/*
Create component labels cstor cvc operator
*/}}
{{- define "cstor.cvcOperator.componentLabels" -}}
openebs.io/component-name: {{ .Values.cvcOperator.componentName | quote }}
{{- end -}}

{{/*
Create component labels cstor cvc operator service
*/}}
{{- define "cstor.cvcOperatorService.componentLabels" -}}
openebs.io/component-name: {{ printf "%s-svc" .Values.cvcOperator.componentName | quote }}
{{- end -}}


{{/*
Create labels for cstor cvc operator
*/}}
{{- define "cstor.cvcOperator.labels" -}}
{{ include "cstor.common.metaLabels" . }}
{{ include "cstor.cvcOperator.matchLabels" . }}
{{ include "cstor.cvcOperator.componentLabels" . }}
{{- end -}}

{{/*
Create labels for cstor cvc operator service
*/}}
{{- define "cstor.cvcOperatorService.labels" -}}
{{ include "cstor.common.metaLabels" . }}
{{ include "cstor.cvcOperator.matchLabels" . }}
{{ include "cstor.cvcOperatorService.componentLabels" . }}
{{- end -}}

{{/*
Create match labels for cstor csi node operator
*/}}
{{- define "cstor.csiNode.matchLabels" -}}
name: {{ .Values.csiNode.componentName | quote }}
release: {{ .Release.Name }}
component: {{ .Values.csiNode.componentName | quote }}
{{- end -}}

{{/*
Create component labels cstor csi node operator
*/}}
{{- define "cstor.csiNode.componentLabels" -}}
openebs.io/component-name: {{ .Values.csiNode.componentName | quote }}
{{- end -}}

{{/*
Create labels for cstor csi node operator
*/}}
{{- define "cstor.csiNode.labels" -}}
{{ include "cstor.common.metaLabels" . }}
{{ include "cstor.csiNode.matchLabels" . }}
{{ include "cstor.csiNode.componentLabels" . }}
{{- end -}}

{{/*
Create match labels for cstor csi controller
*/}}
{{- define "cstor.csiController.matchLabels" -}}
name: {{ .Values.csiController.componentName | quote }}
release: {{ .Release.Name }}
component: {{ .Values.csiController.componentName | quote }}
{{- end -}}

{{/*
Create component labels cstor csi controller
*/}}
{{- define "cstor.csiController.componentLabels" -}}
openebs.io/component-name: {{ .Values.csiController.componentName | quote }}
{{- end -}}

{{/*
Create labels for cstor csi controller
*/}}
{{- define "cstor.csiController.labels" -}}
{{ include "cstor.common.metaLabels" . }}
{{ include "cstor.csiController.matchLabels" . }}
{{ include "cstor.csiController.componentLabels" . }}
{{- end -}}

{{/*
Create the name of the priority class for csi node plugin
*/}}
{{- define "cstor.csiNode.priorityClassName" -}}
{{- if .Values.csiNode.priorityClass.create }}
{{- printf "%s-%s" .Release.Name .Values.csiNode.priorityClass.name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s" .Values.csiNode.priorityClass.name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Create the name of the priority class for csi controller plugin
*/}}
{{- define "cstor.csiController.priorityClassName" -}}
{{- if .Values.csiController.priorityClass.create }}
{{- printf "%s-%s" .Release.Name .Values.csiController.priorityClass.name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s" .Values.csiController.priorityClass.name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
