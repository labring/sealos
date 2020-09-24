package install

import (
	"fmt"
	"github.com/fanux/sealos/net"
	"io/ioutil"
	"strings"
	"sync"
)

const (
	FanuxLvscare = "fanux/lvscare:latest"
)

func (s *SealosInstaller) LoadImages() {
	var (
		TmpInitPath = TMPDIR + "/init.sh"
		wg          sync.WaitGroup
	)
	s.ImageList = GetImageList()
	_ = ioutil.WriteFile(TmpInitPath, []byte(InitBashShellString), 0770)
	newHookExist := "cd /root/kube/shell && bash init.sh"
	newHookNotExist := newHookExist + " && " + "(docker load -i ../images/images.tar || true)"

	for _, node := range s.Hosts {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			if ImageExists(node, s.ImageList) {
				// skip load
				SendPackage(TmpInitPath, []string{node}, InitShellPath, nil, &newHookExist)
			} else {
				SendPackage(TmpInitPath, []string{node}, InitShellPath, nil, &newHookNotExist)
			}
		}(node)
	}
	wg.Wait()
}

func (u *SealosUpgrade) LoadImages() {
	all := append(u.Masters, u.Nodes...)
	loadImage := "docker load -i ../images/images.tar || :"
	u.ImageList = GetImageList()
	var wg sync.WaitGroup
	for _, node := range all {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			if !ImageExists(node, u.ImageList) {
				CmdWorkSpace(node, loadImage, InitShellPath)
			}
		}(node)
	}
	wg.Wait()
}

// GetImageList use  kubeadm config  images  list --kubernetes-version version to get image list
func GetImageList() []string {
	cmdImage := fmt.Sprintf("kubeadm config  images  list --kubernetes-version %s --image-repository %s 2> /dev/null", Version, Repo)
	iList := SSHConfig.CmdToString(MasterIPs[0], cmdImage, "\n")
	imageList := strings.Split(iList, "\n")
	imageList = append(imageList, FanuxLvscare)
	if !WithoutCNI {
		calicoImages := []string{net.CalicoPod2Daemon, net.CalicoCniImage, net.CalicoKube, net.CalicoNode}
		imageList = append(imageList, calicoImages...)
	}
	return imageList
}

// ImageExists return ture when images exist
func ImageExists(node string, images []string) bool {
	var cmd string = "("
	for _, image := range images {
		// shell 获取有空行, 空行就跳过。
		if image == "" {
			continue
		}
		cmd += fmt.Sprintf("docker inspect %s &> /dev/null && ", image)
	}
	cmd += "echo ok )|| :"
	return  SSHConfig.CmdToString(node, cmd, "") == "ok"
}
