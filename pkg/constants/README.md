## BASH

- init.sh:  cd /var/lib/sealos/data/<clusterName>/scripts && bash init.sh $criData $registryDomain $registryPort $registryUsername $registryPassword
- init-registry.sh: cd /var/lib/sealos/data/<clusterName>/scripts && bash init-registry.sh $registryPort $registryData $registryConfig
- clean.sh: cd /var/lib/sealos/data/<clusterName>/scripts && bash clean.sh $criData
- clean-registry.sh: cd /var/lib/sealos/data/<clusterName>/scripts && bash clean-registry.sh $registryData $registryConfig
- auth.sh: cd /var/lib/sealos/data/<clusterName>/scripts && bash auth.sh
- check.sh: cd /var/lib/sealos/data/<clusterName>/scripts && bash check.sh

## Data

- logdir:  /var/lib/sealos/log
- tempdir: /var/lib/sealos/temp
- homedir: /var/lib/sealos/data/<clusterName>/
- datadir: /var/lib/sealos/data/<clusterName>/kube
- pkidir:  /var/lib/sealos/data/<clusterName>/pki
- etcdir:  /var/lib/sealos/data/<clusterName>/etc
- packagedir:  /var/lib/sealos/data/<clusterName>/package
- registryedir:  /var/lib/sealos/data/<clusterName>/registry
- kubeadm.conf:  /var/lib/sealos/data/<clusterName>/etc/admin.conf
- manifests: /var/lib/sealos/data/<clusterName>/kube/manifests
- charts: /var/lib/sealos/data/<clusterName>/kube/charts
- registry.yml: /var/lib/sealos/data/<clusterName>/kube/etc/registry.yml
- Kubeadmfile: /var/lib/sealos/data/<clusterName>/kube/etc/Kubeadmfile
- default.json: /var/lib/sealos/data/<clusterName>/kube/scripts/default.json
- scripts: /var/lib/sealos/data/<clusterName>/kube/scripts
- sealctl: /var/lib/sealos/data/<clusterName>/kube/opt/sealctl

## Work

- clusterfile: ~/.sealos/<clusterName>/Clusterfile
