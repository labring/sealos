package install

import (
	"fmt"
	"github.com/cuisongliu/sshcmd/pkg/cmd"
	"github.com/cuisongliu/sshcmd/pkg/filesize"
	"github.com/cuisongliu/sshcmd/pkg/md5sum"
	"github.com/wonderivan/logger"
	"net/url"
	"path"
	"strings"
	"sync"
)

//location : url
//md5
//dst: /root
//hook: cd /root && rm -rf kube && tar zxvf %s  && cd /root/kube/shell && sh init.sh
func SendPackage(location string, hosts []string, dst, hook string) {
	location, md5 := downloadFile(location)
	pkg := path.Base(location)
	fullPath := fmt.Sprintf("%s/%s", dst, pkg)
	mkDstDir := fmt.Sprintf("mkdir -p %s || true", dst)
	var wm sync.WaitGroup
	for _, host := range hosts {
		wm.Add(1)
		go func(host string) {
			defer wm.Done()
			SSHConfig.Cmd(host, mkDstDir)
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
				SSHConfig.Cmd(host, hook)
			}
		}(host)
	}
	wm.Wait()
}

// FetchPackage if url exist wget it, or scp the local package to hosts
// dst is the remote offline path like /root
func FetchPackage(url string, hosts []string, dst string) {
	pkg := path.Base(url)
	fullDst := fmt.Sprintf("%s/%s", dst, pkg)
	mkdstdir := fmt.Sprintf("mkdir -p %s || true", dst)

	//only http
	isHttp := strings.HasPrefix(url, "http")
	wgetCommand := ""
	if isHttp {
		wgetParam := ""
		if strings.HasPrefix(url, "https") {
			wgetParam = "--no-check-certificate"
		}
		wgetCommand = fmt.Sprintf(" wget %s ", wgetParam)
	}
	remoteCmd := fmt.Sprintf("cd %s &&  %s %s", dst, wgetCommand, url)

	var wm sync.WaitGroup
	for _, host := range hosts {
		wm.Add(1)
		go func(host string) {
			defer wm.Done()
			logger.Debug("[%s]please wait for copy offline package", host)
			SSHConfig.Cmd(host, mkdstdir)
			if SSHConfig.IsFilExist(host, fullDst) {
				logger.Warn("[%s]SendPackage: [%s] file is exist", host, fullDst)
			} else {
				if isHttp {
					go SSHConfig.LoggerFileSize(host, fullDst, int(filesize.Do(url)))
					SSHConfig.Cmd(host, remoteCmd)
					rMD5 := SSHConfig.Md5Sum(host, fullDst) //获取已经上传文件的md5
					uMd5 := "urlGetMD5(url)    "            //获取url的md5值
					logger.Debug("[%s] remote file local %s, md5 is %s", host, fullDst, rMD5)
					logger.Debug("[%s] url is %s, md5 is %s", host, url, uMd5)
					if strings.TrimSpace(rMD5) == strings.TrimSpace(uMd5) {
						logger.Info("[%s]file md5 validate success", host)
					} else {
						logger.Error("[%s]copy file md5 validate failed", host)
					}
				} else {
					if !SSHConfig.CopyForMD5(host, url, fullDst, "") {
						logger.Error("[%s]copy file md5 validate failed", host)
					} else {
						logger.Info("[%s]file md5 validate success", host)
					}
				}
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
