{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "openebs.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "openebs.fullname" -}}
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
{{- define "openebs.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create the name of the service account to use
*/}}
{{- define "openebs.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
    {{ default (include "openebs.fullname" .) .Values.serviceAccount.name }}
{{- else -}}
    {{ default "default" .Values.serviceAccount.name }}
{{- end -}}
{{- end -}}


{{/*
Define meta labels for openebs components
*/}}
{{- define "openebs.common.metaLabels" -}}
chart: {{ template "openebs.chart" . }}
heritage: {{ .Release.Service }}
openebs.io/version: {{ .Values.release.version | quote }}
{{- end -}}


{{- define "openebs.ndm-cluster-exporter.name" -}}
{{- $ndmName := default .Chart.Name .Values.ndmExporter.clusterExporter.nameOverride | trunc 63 | trimSuffix "-" }}
{{- $componentName := .Values.ndmExporter.clusterExporter.name | trunc 63 | trimSuffix "-" }}
{{- printf "%s-%s" $ndmName $componentName | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified ndm cluster exporter name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "openebs.ndm-cluster-exporter.fullname" -}}
{{- if .Values.ndmExporter.clusterExporter.fullnameOverride }}
{{- .Values.ndmExporter.clusterExporter.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $ndmClusterExporterName := include "openebs.ndm-cluster-exporter.name" .}}

{{- $name := default $ndmClusterExporterName .Values.ndmExporter.clusterExporter.nameOverride }}
{{- if contains .Release.Name $name }}
{{- $name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "openebs.ndm-node-exporter.name" -}}
{{- $ndmName := default .Chart.Name .Values.ndmExporter.nodeExporter.nameOverride | trunc 63 | trimSuffix "-" }}
{{- $componentName := .Values.ndmExporter.nodeExporter.name | trunc 63 | trimSuffix "-" }}
{{- printf "%s-%s" $ndmName $componentName | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified ndm node exporter name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "openebs.ndm-node-exporter.fullname" -}}
{{- if .Values.ndmExporter.nodeExporter.fullnameOverride }}
{{- .Values.ndmExporter.nodeExporter.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $ndmNodeExporterName := include "openebs.ndm-node-exporter.name" .}}

{{- $name := default $ndmNodeExporterName .Values.ndmExporter.nodeExporter.nameOverride }}
{{- if contains .Release.Name $name }}
{{- $name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create match labels for ndm cluster exporter deployment
*/}}
{{- define "openebs.ndm-cluster-exporter.matchLabels" -}}
app: {{ template "openebs.ndm-cluster-exporter.name" . }}
release: {{ .Release.Name }}
component: {{ default (include "openebs.ndm-cluster-exporter.name" .) .Values.ndmExporter.clusterExporter.componentName }}
{{- end -}}

{{/*
Create component labels for ndm cluster exporter component
*/}}
{{- define "openebs.ndm-cluster-exporter.componentLabels" -}}
name: {{ template "openebs.ndm-node-exporter.name" . }}
openebs.io/component-name: {{ default (include "openebs.ndm-cluster-exporter.name" .) .Values.ndmExporter.clusterExporter.componentName }}
{{- end -}}


{{/*
Create labels for ndm cluster exporter component
*/}}
{{- define "openebs.ndm-cluster-exporter.labels" -}}
{{ include "openebs.common.metaLabels" . }}
{{ include "openebs.ndm-cluster-exporter.matchLabels" . }}
{{ include "openebs.ndm-cluster-exporter.componentLabels" . }}
{{- end -}}

{{/*
Create match labels for ndm node exporter deployment
*/}}
{{- define "openebs.ndm-node-exporter.matchLabels" -}}
app: {{ template "openebs.ndm-node-exporter.name" . }}
release: {{ .Release.Name }}
component: {{ default (include "openebs.ndm-node-exporter.name" .) .Values.ndmExporter.nodeExporter.componentName }}
{{- end -}}

{{/*
Create component labels for ndm node exporter component
*/}}
{{- define "openebs.ndm-node-exporter.componentLabels" -}}
name: {{ template "openebs.ndm-node-exporter.name" . }}
openebs.io/component-name: {{ default (include "openebs.ndm-node-exporter.name" .) .Values.ndmExporter.nodeExporter.componentName }}
{{- end -}}


{{/*
Create labels for ndm cluster node component
*/}}
{{- define "openebs.ndm-node-exporter.labels" -}}
{{ include "openebs.common.metaLabels" . }}
{{ include "openebs.ndm-node-exporter.matchLabels" . }}
{{ include "openebs.ndm-node-exporter.componentLabels" . }}
{{- end -}}
