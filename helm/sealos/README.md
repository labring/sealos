# Bitnami Charts Template

This directory contains a basic scaffolding to serve as the basis for creating a new chart.

Some of the items that need to be implemented are:

- commonAnnotations
- commonLabels
- imagePullSecret
- extraDeploy
- resources.requests
- resources.limits
- livenessProbe
- readinessProbe
- customLivenessProbe
- customReadinessProbe
- podLabels
- affinity
- nodeSelector
- tolerations (that would override the default one)
- podAnnotations
- priorityClassName
- lifecycleHooks
- sidecars
- initContainers
- extraEnvVars
- extraEnvVarsCM
- extraEnvVarsSecret
- command (which would override the default one)
- args (which would override the default one)
- extraVolumes
- extraVolumeMounts
- updateStrategy
- podSecurityContext
- containerSecurityContext

Also it is necessary to use the `bitnami/common` chart to standarize some of the above items.

:warning: Take into account this is just an example to follow, depending on the specific use case you will need to remove, add or modify those templates, beyond replacing the placeholders `%%FOO%%`
