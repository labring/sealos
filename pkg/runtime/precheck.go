package runtime

import (
	"context"
	"path/filepath"

	netutils "k8s.io/utils/net"

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/checker"
	"github.com/labring/sealos/pkg/utils/logger"
)

func (k *KubeadmRuntime) preCheck() error {
	logger.Info("Executing pipeline Check in CreateProcessor.")
	err := k.RunBaseCheck()
	if err != nil {
		return err
	}
	err = k.RunKubeadmInitCheck()
	if err != nil {
		return err
	}
	err = k.RunKubeadmJoinCheck()
	if err != nil {
		return err
	}
	return nil
}

// BaseCheck is a basic check for all nodes,which check the total environment,such as nodename ssh connection.
func (k *KubeadmRuntime) RunBaseCheck() error {
	allNodeIPs := k.Cluster.GetAllIPS()
	check := []checker.Interface{
		checker.NewHostnameUniqueChecker(allNodeIPs),
		checker.NewTimeSyncChecker(allNodeIPs),
		checker.NewHostnameFormatChecker(allNodeIPs),
	}
	return checker.RunCheckList(check, k.Cluster, checker.PhasePre)
}

func (k *KubeadmRuntime) RunKubeadmInitCheck() error {
	var InitCheck []checker.Interface

	masterList := k.getMasterIPList()
	eg, _ := errgroup.WithContext(context.Background())
	for _, IP := range masterList {
		ip := IP
		eg.Go(func() error {
			InitCheck = k.addInitChecks(InitCheck, ip)
			err := checker.RunCheckList(InitCheck, k.Cluster, checker.PhasePre)
			if err != nil {
				return err
			}
			return nil
		})
	}
	return nil
}

func (k *KubeadmRuntime) RunKubeadmJoinCheck() error {
	var JoinCheck []checker.Interface

	nodeList := k.getNodeIPList()
	eg, _ := errgroup.WithContext(context.Background())
	for _, IP := range nodeList {
		ip := IP
		eg.Go(func() error {
			JoinCheck = k.addJoinChecks(JoinCheck, ip)
			err := checker.RunCheckList(JoinCheck, k.Cluster, checker.PhasePre)
			if err != nil {
				return err
			}
			return nil
		})
	}
	return nil
}

func (k *KubeadmRuntime) addInitChecks(checks []checker.Interface, ip string) []checker.Interface {
	manifestsDir := filepath.Join(checker.KubernetesDir, checker.ManifestsSubDirName)
	checks = append(checks, checker.NewIsPrivilegedUserCheck(ip),
		checker.NewIsPrivilegedUserCheck(ip),
		checker.NewNumCPUCheck(checker.ControlPlaneNumCPU, ip),
		checker.NewMemCheck(checker.ControlPlaneMem, ip),
		checker.NewServiceCheck(checker.FirewalldSvcName, "", ip),
		checker.NewPortOpenCheck(checker.KubeSchedulerPort, ip),
		checker.NewPortOpenCheck(checker.KubeControllerManagerPort, ip),
		checker.NewPortOpenCheck(int(k.getAPIServerPort()), ip),
		checker.NewFileAvailableCheck(k.GetStaticPodFilepath(checker.KubeAPIServer, manifestsDir), "", ip),
		checker.NewFileAvailableCheck(k.GetStaticPodFilepath(checker.KubeControllerManager, manifestsDir), "", ip),
		checker.NewFileAvailableCheck(k.GetStaticPodFilepath(checker.KubeScheduler, manifestsDir), "", ip),
		checker.NewFileAvailableCheck(k.GetStaticPodFilepath(checker.Etcd, manifestsDir), "", ip),
		checker.NewHTTPProxyCheck("https", k.InitConfiguration.LocalAPIEndpoint.AdvertiseAddress),
	)
	checks = addCommenChecks(checks, ip)
	//TODO：support external etcd

	// Check if Bridge-netfilter and IPv6 relevant flags are set
	if ip := netutils.ParseIPSloppy(k.InitConfiguration.LocalAPIEndpoint.AdvertiseAddress); ip != nil {
		if netutils.IsIPv6(ip) {
			checks = addIPv6Checks(checks, string(ip))
		}
	}
	if k.InitConfiguration.Etcd.Local != nil {
		// Only do etcd related checks when required to install a local etcd
		checks = append(checks,
			checker.NewPortOpenCheck(checker.EtcdListenClientPort, ip),
			checker.NewPortOpenCheck(checker.EtcdMetricsPort, ip),
			checker.NewDirAvailableCheck(k.InitConfiguration.Etcd.Local.DataDir, "", ip),
		)
	}

	return checks
}

func (k *KubeadmRuntime) addJoinChecks(checks []checker.Interface, ip string) []checker.Interface {
	checks = append(checks,
		checker.NewIsPrivilegedUserCheck(ip),
		checker.NewFileAvailableCheck(filepath.Join(checker.KubernetesDir, checker.KubeletKubeConfigFileName), "", ip),
		checker.NewFileAvailableCheck(filepath.Join(checker.KubernetesDir, checker.KubeletBootstrapKubeConfigFileName), "", ip),
	)
	checks = addCommenChecks(checks, ip)
	return checks
}

func addCommenChecks(checks []checker.Interface, ip string) []checker.Interface {
	checks = addIPv4Checks(checks, ip)
	checks = addExecChecks(checks, ip)
	checks = append(checks,
		checker.NewSwapCheck(ip),
		checker.NewPortOpenCheck(checker.KubeletPort, ip),
	)
	return checks
}

// addIPv4Checks add ipv4 checks,just support linux env now.
func addIPv4Checks(checks []checker.Interface, ip string) []checker.Interface {
	checks = append(checks, checker.NewFileContentCheck(
		checker.Bridgenf, []byte{'1'}, "", ip),
		checker.NewFileContentCheck(checker.Ipv4Forward, []byte{'1'}, "", ip),
	)
	return checks
}

// addIPv6Checks add ipv6 checks,just support linux env now.
func addIPv6Checks(checks []checker.Interface, ip string) []checker.Interface {
	checks = append(checks, checker.NewFileContentCheck(
		checker.Bridgenf6, []byte{'1'}, "", ip),
		checker.NewFileContentCheck(checker.Ipv6DefaultForwarding, []byte{'1'}, "", ip),
	)
	return checks
}

// addExecChecks adds checks that verify if certain binaries are in PATH
func addExecChecks(checks []checker.Interface, ip string) []checker.Interface {
	checks = append(checks,
		checker.NewInpathCheck("conntrack", true, "", "", ip),
		checker.NewInpathCheck("ip", true, "", "", ip),
		checker.NewInpathCheck("iptables", true, "", "", ip),
		checker.NewInpathCheck("mount", true, "", "", ip),
		checker.NewInpathCheck("nsenter", true, "", "", ip),
		checker.NewInpathCheck("ebtables", false, "", "", ip),
		checker.NewInpathCheck("ethtool", false, "", "", ip),
		checker.NewInpathCheck("socat", false, "", "", ip),
		checker.NewInpathCheck("tc", false, "", "", ip),
		checker.NewInpathCheck("touch", false, "", "", ip),
	)
	return checks
}
