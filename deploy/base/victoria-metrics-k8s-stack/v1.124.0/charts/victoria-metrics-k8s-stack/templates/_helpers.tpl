{{- define "vm.read.endpoint" -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $endpoint := default dict -}}
  {{- $_ := set . "style" "managed" -}}
  {{- if $Values.vmsingle.enabled -}}
    {{- $_ := set . "appKey" (list "vmsingle" "spec") -}}
    {{- $_ := set $endpoint "url" (include "vm.url" .) -}}
  {{- else if and $Values.vmcluster.enabled $Values.vmcluster.spec.vmselect.enabled -}}
    {{- $_ := set . "appKey" (list "vmcluster" "spec" "vmselect") -}}
    {{- $baseURL := include "vm.url" . -}}
    {{- $tenant := $Values.tenant | default 0 -}}
    {{- $_ := set $endpoint "url" (printf "%s/select/%d/prometheus" $baseURL (int $tenant)) -}}
  {{- else if $Values.external.vm.read.url -}}
    {{- $endpoint = $Values.external.vm.read -}}
  {{- end -}}
  {{- with $endpoint -}}
    {{- toYaml . -}}
  {{- end -}}
{{- end }}

{{- define "vm.write.endpoint" -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $endpoint := default dict -}}
  {{- $_ := set . "style" "managed" -}}
  {{- if $Values.vmsingle.enabled -}}
    {{- $_ := set . "appKey" (list "vmsingle" "spec") -}}
    {{- $baseURL := include "vm.url" . -}}
    {{- $_ := set $endpoint "url" (printf "%s/api/v1/write" $baseURL) -}}
  {{- else if and $Values.vmcluster.enabled $Values.vmcluster.spec.vminsert.enabled -}}
    {{- $_ := set . "appKey" (list "vmcluster" "spec" "vminsert") -}}
    {{- $baseURL := include "vm.url" . -}}
    {{- $tenant := $Values.tenant | default 0 -}}
    {{- $_ := set $endpoint "url" (printf "%s/insert/%d/prometheus/api/v1/write" $baseURL (int $tenant)) -}}
  {{- else if $Values.external.vm.write.url -}}
    {{- $endpoint = $Values.external.vm.write -}}
  {{- end -}}
  {{- with $endpoint -}}
    {{- toYaml . -}}
  {{- end -}}
{{- end -}}

{{- /* VMAlert remotes */ -}}
{{- define "vm.alert.remotes" -}}
  {{- $ctx := . -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $remotes := default dict -}}
  {{- $fullname := include "vm.managed.fullname" . -}}
  {{- $_ := set $ctx "style" "managed" -}}
  {{- $remoteWrite := include "vm.write.endpoint" $ctx | fromYaml -}}
  {{- if and $Values.vmalert.remoteWriteVMAgent $Values.vmagent.enabled -}}
    {{- $_ := set $ctx "appKey" (list "vmagent" "spec") -}}
    {{- $remoteWrite = dict "url" (printf "%s/api/v1/write" (include "vm.url" $ctx)) -}}
    {{- $_ := unset $ctx "appKey" -}}
    {{- $_ := set $remotes "remoteWrite" $remoteWrite -}}
  {{- else -}}
    {{- $_ := set $remotes "remoteWrite" $remoteWrite -}}
  {{- end -}}
  {{- $readEndpoint := include "vm.read.endpoint" $ctx -}}
  {{- if $readEndpoint }}
    {{- $remoteRead := fromYaml $readEndpoint -}}
    {{- $_ := set $remotes "remoteRead" $remoteRead -}}
    {{- $_ := set $remotes "datasource" $remoteRead -}}
  {{- else if or (not $Values.vmalert.spec.datasource) (not $Values.vmalert.spec.remoteRead) -}}
    {{- fail "VM read source required! Either set `vmalert.enabled: false` or provide `vmalert.spec.remoteRead.url` and `vmalert.spec.datasource.url`" -}}
  {{- end -}}
  {{- if $Values.vmalert.additionalNotifierConfigs }}
    {{- $configName := printf "%s-additional-notifier" $fullname -}}
    {{- $notifierConfigRef := dict "name" $configName "key" "notifier-configs.yaml" -}}
    {{- $_ := set $remotes "notifierConfigRef" $notifierConfigRef -}}
  {{- else if $Values.alertmanager.enabled -}}
    {{- $notifiers := default list -}}
    {{- $appSecure := not (empty ((($Values.alertmanager).spec).webConfig).tls_server_config) -}}
    {{- $_ := set $ctx "appKey" (list "alertmanager" "spec") -}}
    {{- $_ := set $ctx "appSecure" $appSecure -}}
    {{- $_ := set $ctx "appRoute" (($Values.alertmanager).spec).routePrefix -}}
    {{- $alertManagerReplicas := $Values.alertmanager.spec.replicaCount | default 1 | int -}}
    {{- range until $alertManagerReplicas -}}
      {{- $_ := set $ctx "appIdx" . -}}
      {{- $notifiers = append $notifiers (dict "url" (include "vm.url" $ctx)) -}}
    {{- end }}
    {{- $_ := set $remotes "notifiers" $notifiers -}}
  {{- end -}}
  {{- toYaml $remotes -}}
{{- end -}}

{{- /* VMAlert templates */ -}}
{{- define "vm.alert.templates" -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $cms :=  ($Values.vmalert.spec.configMaps | default list) -}}
  {{- if $Values.vmalert.templateFiles -}}
    {{- $fullname := include "vm.managed.fullname" . -}}
    {{- $cms = append $cms (printf "%s-extra-tpl" $fullname) -}}
  {{- end -}}
  {{- $output := dict "configMaps" (compact $cms) -}}
  {{- toYaml $output -}}
{{- end -}}

{{- define "vm.license.global" -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $license := (deepCopy ($Values.global).license) | default dict -}}
  {{- if $license.key -}}
    {{- if hasKey $license "keyRef" -}}
      {{- $_ := unset $license "keyRef" -}}
    {{- end -}}
  {{- else if $license.keyRef.name -}}
    {{- if hasKey $license "key" -}}
      {{- $_ := unset $license "key" -}}
    {{- end -}}
  {{- else -}}
    {{- $license = default dict -}}
  {{- end -}}
  {{- toYaml $license -}}
{{- end -}}

{{- /* VMAlert spec */ -}}
{{- define "vm.alert.spec" -}}
  {{- $Values := (.helm).Values | default .Values }}
  {{- $Chart := (.helm).Chart | default .Chart }}
  {{- $image := dict "tag" (include "vm.image.tag" .) }}
  {{- $extraArgs := dict "remoteWrite.disablePathAppend" "true" -}}
  {{- $fullname := include "vm.managed.fullname" . }}
  {{- if $Values.vmalert.templateFiles -}}
    {{- $ruleTmpl := printf "/etc/vm/configs/%s-extra-tpl/*.tmpl" $fullname -}}
    {{- $_ := set $extraArgs "rule.templates" $ruleTmpl -}}
  {{- end -}}
  {{- $vmAlertTemplates := include "vm.alert.templates" . | fromYaml -}}
  {{- $vmAlertRemotes := include "vm.alert.remotes" . | fromYaml -}}
  {{- $spec := dict "extraArgs" $extraArgs "image" $image -}}
  {{- with (include "vm.license.global" .) -}}
    {{- $_ := set $spec "license" (fromYaml .) -}}
  {{- end -}}
  {{- with concat ($vmAlertRemotes.notifiers | default list) ($Values.vmalert.spec.notifiers | default list) }}
    {{- $_ := set $vmAlertRemotes "notifiers" . }}
  {{- end }}
  {{- $spec := deepCopy (omit $Values.vmalert.spec "notifiers") | mergeOverwrite $vmAlertRemotes | mergeOverwrite $vmAlertTemplates | mergeOverwrite $spec }}
  {{- if not (or (hasKey $spec "notifier") (hasKey $spec "notifiers") (hasKey $spec "notifierConfigRef") (hasKey $spec.extraArgs "notifier.blackhole")) }}
    {{- fail "Neither `notifier`, `notifiers` nor `notifierConfigRef` is set for vmalert. If it's intentionally please consider setting `.vmalert.spec.extraArgs.['notifier.blackhole']` to `'true'`"}}
  {{- end }}
  {{- $output := deepCopy (omit $Values.vmalert.spec "notifiers") | mergeOverwrite $vmAlertRemotes | mergeOverwrite $vmAlertTemplates | mergeOverwrite $spec -}}
  {{- if or $Values.grafana.enabled $Values.external.grafana.host }}
    {{- if not (index $output.extraArgs "external.alert.source") -}}
      {{- $alertSourceTpl := `{"datasource":%q,"queries":[{"expr":{{"{{"}} .Expr|jsonEscape|queryEscape {{"}}"}},"refId":"A"}],"range":{"from":"{{"{{"}} .ActiveAt.UnixMilli {{"}}"}}","to":"now"}}` -}}
      {{- $alertSource := "" -}}
      {{- if $Values.external.grafana.host -}}
        {{- $alertSource = printf $alertSourceTpl $Values.external.grafana.datasource -}}
      {{- else -}}
        {{- $alertSource = printf $alertSourceTpl (index $Values.defaultDatasources.victoriametrics.datasources 0 "name") -}}
      {{- end -}}
      {{- $_ := set $output.extraArgs "external.alert.source" (printf "explore?left=%s" $alertSource) -}}
    {{- end -}}
    {{- if not (index $output.extraArgs "external.url") -}}
      {{- $grafanaHost := ternary (index (($Values.grafana).ingress).hosts 0) (($Values.external).grafana).host ($Values.grafana).enabled }}
      {{- $_ := set $output.extraArgs "external.url" (printf "http://%s" $grafanaHost) -}}
    {{- end -}}
  {{- end -}}
  {{- tpl ($output | toYaml) . -}}
{{- end -}}

{{- /* VM Agent remoteWrites */ -}}
{{- define "vm.agent.remote.write" -}}
  {{- $Values := (.helm).Values | default .Values }}
  {{- $remoteWrites := $Values.vmagent.additionalRemoteWrites | default list }}
  {{- with include "vm.write.endpoint" . -}}
    {{- $rws := $Values.vmagent.spec.remoteWrite | list (default dict) }}
    {{- $rw := fromYaml . }}
    {{- $remoteWrites = append $remoteWrites (mergeOverwrite $rw (deepCopy (first $rws))) }}
  {{- end -}}
  {{- toYaml (dict "remoteWrite" $remoteWrites) -}}
{{- end -}}

{{- /* VMAgent spec */ -}}
{{- define "vm.agent.spec" -}}
  {{- $Values := (.helm).Values | default .Values }}
  {{- $Chart := (.helm).Chart | default .Chart }}
  {{- $image := dict "tag" (include "vm.image.tag" .) }}
  {{- $spec := include "vm.agent.remote.write" . | fromYaml -}}
  {{- with (include "vm.license.global" .) -}}
    {{- $_ := set $spec "license" (fromYaml .) -}}
  {{- end -}}
  {{- $_ := set $spec "image" $image -}}
  {{- tpl (mergeOverwrite (deepCopy $spec) (deepCopy $Values.vmagent.spec) | toYaml) . -}}
{{- end }}

{{- /* VMAuth spec */ -}}
{{- define "vm.auth.spec" -}}
  {{- $Values := (.helm).Values | default .Values }}
  {{- $image := dict "tag" (include "vm.image.tag" .) }}
  {{- $_ := set . "style" "managed" -}}
  {{- $vm := default dict -}}
  {{- if $Values.vmsingle.enabled -}}
    {{- $_ := set . "appKey" (list "vmsingle" "spec") -}}
    {{- $url := urlParse (include "vm.url" .) -}}
    {{- $_ := set $vm "read" $url -}}
    {{- $_ := set $vm "write" $url -}}
  {{- else if $Values.vmcluster.enabled -}}
    {{- if $Values.vmcluster.spec.vminsert.enabled -}}
      {{- $_ := set . "appKey" (list "vmcluster" "spec" "vminsert") -}}
      {{- $writeURL := urlParse (include "vm.url" .) -}}
      {{- $_ := set $writeURL "path" (printf "%s/insert" $writeURL.path) -}}
      {{- $_ := set $vm "write" $writeURL }}
    {{- else if $Values.external.vm.write.url -}}
      {{- $_ := set $vm (urlParse $Values.external.vm.write.url) -}}
    {{- end -}}
    {{- if $Values.vmcluster.spec.vmselect.enabled -}}
      {{- $_ := set . "appKey" (list "vmcluster" "spec" "vmselect") -}}
      {{- $readURL := urlParse (include "vm.url" .) -}}
      {{- $_ := set $readURL "path" (printf "%s/select" $readURL.path) -}}
      {{- $_ := set $vm "read" $readURL }}
    {{- else if $Values.external.vm.read.url -}}
      {{- $_ := set $vm (urlParse $Values.external.vm.read.url) -}}
    {{- end -}}
    {{- $_ := set . "vm" $vm -}}
  {{- else if or $Values.external.vm.read.url $Values.external.vm.write.url -}}
    {{- with $Values.external.vm.read.url -}}
      {{- $_ := set $vm "read" (urlParse .) -}}
    {{- end -}}
    {{- with $Values.external.vm.write.url -}}
      {{- $_ := set $vm "write" (urlParse .) -}}
    {{- end -}}
  {{- end -}}
  {{- $_ := set . "vm" $vm -}}
  {{- $spec := $Values.vmauth.spec }}
  {{- if $spec.unauthorizedUserAccessSpec }}
    {{- if $spec.unauthorizedUserAccessSpec.disabled }}
      {{- $_ := unset $spec "unauthorizedUserAccessSpec" }}
    {{- else -}}
      {{- $_ := unset $spec.unauthorizedUserAccessSpec "disabled" }}
    {{- end -}}
  {{- end -}}
  {{- $_ := set $spec "image" (mergeOverwrite (deepCopy $image) (deepCopy ($spec.image | default dict))) -}}
  {{- with (include "vm.license.global" .) -}}
    {{- $_ := set $spec "license" (fromYaml .) -}}
  {{- end -}}
  {{- tpl (toYaml $spec) . -}}
{{- end -}}

{{- /* Alermanager spec */ -}}
{{- define "vm.alertmanager.spec" -}}
  {{- $Values := (.helm).Values | default .Values }}
  {{- $fullname := include "vm.managed.fullname" . -}}
  {{- $app := $Values.alertmanager }}
  {{- $spec := $app.spec -}}
  {{- if and (not $spec.configRawYaml) (not $spec.configSecret) (not $Values.alertmanager.useManagedConfig) -}}
    {{- $_ := set $spec "configSecret" $fullname -}}
  {{- end -}}
  {{- $templates := $spec.templates | default list -}}
  {{- if $Values.alertmanager.monzoTemplate.enabled -}}
    {{- $configMap := printf "%s-monzo-tpl" $fullname -}}
    {{- $templates = append $templates (dict "name" $configMap "key" "monzo.tmpl") -}}
  {{- end -}}
  {{- $configMap := printf "%s-extra-tpl" $fullname -}}
  {{- range $key, $value := $Values.alertmanager.templateFiles | default dict -}}
    {{- $templates = append $templates (dict "name" $configMap "key" $key) -}}
  {{- end -}}
  {{- if and ($app.useManagedConfig) (not (hasKey $spec "disableNamespaceMatcher")) }}
    {{- $_ := set $spec "disableNamespaceMatcher" true }}
  {{- end }}
  {{- $_ := set $spec "templates" $templates -}}
  {{- toYaml $spec -}}
{{- end -}}

{{- /* Single spec */ -}}
{{- define "vm.single.spec" -}}
  {{- $Values := (.helm).Values | default .Values }}
  {{- $Chart := (.helm).Chart | default .Chart }}
  {{- $image := dict "tag" (include "vm.image.tag" .) }}
  {{- $extraArgs := default dict -}}
  {{- $_ := set . "style" "managed" -}}
  {{- if $Values.vmalert.enabled }}
    {{- $_ := set . "appKey" (list "vmalert" "spec") }}
    {{- $_ := set $extraArgs "vmalert.proxyURL" (include "vm.url" .) -}}
  {{- end -}}
  {{- $spec := dict "extraArgs" $extraArgs "image" $image -}}
  {{- with (include "vm.license.global" .) -}}
    {{- $_ := set $spec "license" (fromYaml .) -}}
  {{- end -}}
  {{- tpl (deepCopy $Values.vmsingle.spec | mergeOverwrite $spec | toYaml) . -}}
{{- end }}

{{- /* Cluster spec */ -}}
{{- define "vm.select.spec" -}}
  {{- $Values := (.helm).Values | default .Values }}
  {{- $Chart := (.helm).Chart | default .Chart }}
  {{- $extraArgs := default dict -}}
  {{- $_ := set . "style" "managed" -}}
  {{- if $Values.vmalert.enabled -}}
    {{- $_ := set . "appKey" (list "vmalert" "spec") -}}
    {{- $_ := set $extraArgs "vmalert.proxyURL" (include "vm.url" .) -}}
  {{- end -}}
  {{- $spec := dict "extraArgs" $extraArgs -}}
  {{- toYaml $spec -}}
{{- end -}}

{{- define "vm.cluster.spec" -}}
  {{- $Values := (.helm).Values | default .Values }}
  {{- $Chart := (.helm).Chart | default .Chart }}
  {{- $selectSpec := include "vm.select.spec" . | fromYaml -}}
  {{- $clusterSpec := deepCopy $Values.vmcluster.spec -}}
  {{- $clusterSpec = mergeOverwrite (dict "clusterVersion" (printf "%s-cluster" (include "vm.image.tag" .))) $clusterSpec -}}
  {{- with (include "vm.license.global" .) -}}
    {{- $_ := set $clusterSpec "license" (fromYaml .) -}}
  {{- end -}}
  {{- if ($clusterSpec.requestsLoadBalancer).enabled }}
    {{- $balancerSpec := $clusterSpec.requestsLoadBalancer.spec | default dict }}
    {{- $authImage := dict "image" (dict "tag" (include "vm.image.tag" .)) }}
    {{- $_ := set $clusterSpec.requestsLoadBalancer "spec" (mergeOverwrite $authImage $balancerSpec) }}
  {{- end }}
  {{- $clusterSpec = mergeOverwrite (dict "vmselect" $selectSpec) $clusterSpec }}
  {{- if not $clusterSpec.vmselect.enabled -}}
    {{- $_ := unset $clusterSpec "vmselect" -}}
  {{- else -}}
    {{- $_ := unset $clusterSpec.vmselect "enabled" -}}
  {{- end -}}
  {{- if not $clusterSpec.vminsert.enabled -}}
    {{- $_ := unset $clusterSpec "vminsert" -}}
  {{- else -}}
    {{- $_ := unset $clusterSpec.vminsert "enabled" -}}
  {{- end -}}
  {{- tpl (toYaml $clusterSpec) . -}}
{{- end -}}

{{- define "vm.data.source.enabled" -}}
  {{- $Values := (.helm).Values | default .Values -}}
  {{- $grafana := $Values.grafana -}}
  {{- $installed := default list }}
  {{- range $plugin := ($grafana.plugins | default list) -}}
    {{- $plugin = splitList ";" $plugin | reverse | first }}
    {{- $installed = append $installed $plugin }}
  {{- end -}}
  {{- $ds := .ds -}}
  {{- toString (or (not (hasKey $ds "version")) (has $ds.type $installed)) -}}
{{- end -}}

{{- /* Datasources */ -}}
{{- define "vm.data.sources" -}}
  {{- $ctx := . }}
  {{- $Values := (.helm).Values | default .Values }}
  {{- $datasources := $Values.defaultDatasources.extra | default list -}}
  {{- $readURL := include "vm.read.endpoint" $ctx -}}
  {{- if $readURL -}}
    {{- $readEndpoint := fromYaml $readURL -}}
    {{- $defaultDatasources := default list -}}
    {{- range $ds := $Values.defaultDatasources.victoriametrics.datasources }}
      {{- $_ := set $ds "url" $readEndpoint.url -}}
      {{- $defaultDatasources = append $defaultDatasources $ds -}}
    {{- end }}
    {{- $datasources = concat $datasources $defaultDatasources -}}
    {{- if and $Values.defaultDatasources.victoriametrics.perReplica $defaultDatasources -}}
      {{- range $id := until (int $Values.vmsingle.spec.replicaCount) -}}
        {{- $_ := set $ctx "appIdx" $id -}}
        {{- $readEndpoint := include "vm.read.endpoint" $ctx | fromYaml -}}
        {{- range $ds := $defaultDatasources -}}
          {{- $ds = deepCopy $ds -}}
          {{- $_ := set $ds "url" $readEndpoint.url -}}
          {{- $_ := set $ds "name" (printf "%s-%d" $ds.name $id) -}}
          {{- $_ := set $ds "isDefault" false -}}
          {{- $datasources = append $datasources $ds -}}
        {{- end -}}
      {{- end -}}
    {{- end -}}
  {{- end -}}
  {{- if $Values.alertmanager.enabled -}}
    {{- range $ds := $Values.defaultDatasources.alertmanager.datasources }}
      {{- $appSecure := not (empty ((($Values.alertmanager).spec).webConfig).tls_server_config) -}}
      {{- $_ := set $ctx "appKey" (list "alertmanager" "spec") -}}
      {{- $_ := set $ctx "appSecure" $appSecure -}}
      {{- $_ := set $ctx "appRoute" (($Values.alertmanager).spec).routePrefix -}}
      {{- $_ := set $ds "url" (include "vm.url" $ctx) -}}
      {{- $_ := set $ds "type" "alertmanager" -}}
      {{- $datasources = append $datasources $ds -}}
    {{- end }}
  {{- end -}}
  {{- toYaml (dict "datasources" $datasources) -}}
{{- end }}

{{- /* VMRule name */ -}}
{{- define "vm-k8s-stack.rulegroup.name" -}}
  {{- printf "%s-%s" (include "vm.fullname" .) (.name | replace "_" "") -}}
{{- end -}}

{{- /* VMRule labels */ -}}
{{- define "vm-k8s-stack.rulegroup.labels" -}}
  {{- $Values := (.helm).Values | default .Values }}
  {{- $labels := fromYaml (include "vm.labels" .) -}}
  {{- $_ := set $labels "app" (include "vm.name" .) -}}
  {{- $labels = mergeOverwrite $labels (deepCopy $Values.defaultRules.labels) -}}
  {{- toYaml $labels -}}
{{- end }}

{{- /* VMRule key */ -}}
{{- define "vm-k8s-stack.rulegroup.key" -}}
  {{- without (regexSplit "[-_.]" .name -1) "exporter" "rules" | join "-" | camelcase | untitle -}}
{{- end -}}

{{- /* VMAlertmanager name */ -}}
{{- define "vm-k8s-stack.alertmanager.name" -}}
  {{- $Values := (.helm).Values | default .Values }}
  {{- $_ := set . "appKey" (list "alertmanager" "spec") -}}
  {{- $Values.alertmanager.name | default (include "vm.managed.fullname" .) -}}
{{- end -}}

{{- define "vm-k8s-stack.nodeExporter.name" -}}
  {{- $Values := (.helm).Values | default .Values }}
  {{- (index $Values "prometheus-node-exporter").service.labels.jobLabel | default "node-exporter" }}
{{- end -}}
