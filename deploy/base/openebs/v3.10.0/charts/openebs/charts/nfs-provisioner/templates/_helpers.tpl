{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "nfsProvisioner.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "nfsProvisioner.fullname" -}}
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
Create the name of the service account to use
*/}}
{{- define "nfsProvisioner.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
    {{ default (include "nfsProvisioner.fullname" .) .Values.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccount.name }}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "nfsProvisioner.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Meta labels
*/}}
{{- define "nfsProvisioner.common.metaLabels" -}}
chart: {{ include "nfsProvisioner.chart" . }}
heritage: {{ .Release.Service }}
openebs.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{/*
Selector Labels
*/}}
{{- define "nfsProvisioner.selectorLabels" -}}
app: {{ include "nfsProvisioner.name" . }}
release: {{ .Release.Name }}
component: {{ .Values.nfsProvisioner.name }}
{{- end }}

{{/*
Component labels
*/}}
{{- define "nfsProvisioner.componentLabels" -}}
openebs.io/component-name: openebs-{{ .Values.nfsProvisioner.name }}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "nfsProvisioner.labels" -}}
{{ include "nfsProvisioner.common.metaLabels" . }}
{{ include "nfsProvisioner.selectorLabels" . }}
{{ include "nfsProvisioner.componentLabels" . }}
{{- end -}}
