package install

import (
	"fmt"
	"github.com/cuisongliu/sshcmd/pkg/cmd"
	"github.com/cuisongliu/sshcmd/pkg/filesize"
	"github.com/cuisongliu/sshcmd/pkg/md5sum"
	"github.com/wonderivan/logger"
	"net/url"
	"path"
	"sync"
)

//location : url
//md5
//dst: /root
//hook: cd /root && rm -rf kube && tar zxvf %s  && cd /root/kube/shell && sh init.sh
func SendPackage(location string, hosts []string, dst, hook string) {
	location, md5 := downloadFile(location)
	PkgUrl = location
	pkg := path.Base(location)
	fullPath := fmt.Sprintf("%s/%s", dst, pkg)
	mkDstDir := fmt.Sprintf("mkdir -p %s || true", dst)
	var wm sync.WaitGroup
	for _, host := range hosts {
		wm.Add(1)
		go func(host string) {
			defer wm.Done()
			_ = SSHConfig.CmdAsync(host, mkDstDir)
			logger.Debug("[%s]please wait for mkDstDir", host)
			if SSHConfig.IsFilExist(host, fullPath) {
				logger.Warn("[%s]SendPackage: file is exist", host)
			} else {
				if ok := SSHConfig.CopyForMD5(host, location, fullPath, md5); ok {
					logger.Info("[%s]copy file md5 validate success", host)
				} else {
					logger.Error("[%s]copy file md5 validate failed", host)
				}
			}
			if hook != "" {
				logger.Debug("[%s]please wait for hook", host)
				_ = SSHConfig.CmdAsync(host, hook)
			}
		}(host)
	}
	wm.Wait()
}

//
func downloadFile(location string) (filePATH, md5 string) {
	if _, isUrl := isUrl(location); isUrl {
		absPATH := "/tmp/sealos/" + path.Base(location)
		if cmd.IsFilExist(absPATH) {
			//logs
			logger.Warn("[%s] file is exist", absPATH)
			location = absPATH
			goto end
		}
		//generator download cmd
		dwnCmd := downloadCmd(location)
		//go func watch filesize
		go cmd.LoggerFileSize(absPATH, int(filesize.Do(location)))
		//os exec download command
		cmd.Cmd("/bin/sh", "-c", "mkdir -p /tmp/sealos && cd /tmp/sealos && "+dwnCmd)
		location = absPATH
	}
end:
	//file md5
	md5 = md5sum.FromLocal(location)
	return location, md5
}

//根据url 获取command
func downloadCmd(url string) string {
	//only http
	u, isHttp := isUrl(url)
	var c = ""
	if isHttp {
		param := ""
		if u.Scheme == "https" {
			param = "--no-check-certificate"
		}
		c = fmt.Sprintf(" wget %s %s", param, url)
	}
	return c
}

func isUrl(u string) (url.URL, bool) {
	if uu, err := url.Parse(u); err == nil && uu != nil && uu.Host != "" {
		return *uu, true
	}
	return url.URL{}, false
}
