package install

import (
	"fmt"
	"github.com/cuisongliu/sshcmd/pkg/filesize"
	"github.com/wonderivan/logger"
	"math/big"
	"math/rand"
	"net"
	"net/url"
	"os"
	"path"
	"strconv"
	"strings"
	"sync"
	"time"
)

const oneMBByte = 1024 * 1024

//VersionToInt v1.15.6  => 115
func VersionToInt(version string) int {
	// v1.15.6  => 1.15.6
	version = strings.Replace(version, "v", "", -1)
	versionArr := strings.Split(version, ".")
	if len(versionArr) >= 2 {
		versionStr := versionArr[0] + versionArr[1]
		if i, err := strconv.Atoi(versionStr); err == nil {
			return i
		}
	}
	return 0
}

//IpFormat is
func IpFormat(host string) string {
	ipAndPort := strings.Split(host, ":")
	return ipAndPort[0]
}

func SendPackage(url string, hosts []string, packName string) {
	pkg := path.Base(url)
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
	remoteCmd := fmt.Sprintf("cd /root &&  %s %s && tar zxvf %s", wgetCommand, url, pkg)
	localCmd := fmt.Sprintf("cd /root && rm -rf %s && tar zxvf %s ", packName, pkg)
	kubeLocal := fmt.Sprintf("/root/%s", pkg)
	var kubeCmd string
	if packName == "kube" {
		kubeCmd = "cd /root/kube/shell && sh init.sh"
	} else {
		kubeCmd = fmt.Sprintf("cd /root/%s && docker load -i images.tar", packName)
	}

	var wm sync.WaitGroup
	for _, host := range hosts {
		wm.Add(1)
		go func(host string) {
			defer wm.Done()
			logger.Debug("[%s]please wait for tar zxvf exec", host)
			if SSHConfig.IsFilExist(host, kubeLocal) {
				logger.Warn("[%s]SendPackage: file is exist", host)
				SSHConfig.Cmd(host, localCmd)
			} else {
				if isHttp {
					go SSHConfig.LoggerFileSize(host, kubeLocal, int(filesize.Do(url)))
					SSHConfig.Cmd(host, remoteCmd)
					rMD5 := SSHConfig.Md5Sum(host, kubeLocal) //获取已经上传文件的md5
					uMd5 := UrlGetMd5(url)                    //获取url的md5值
					logger.Debug("[%s] remote file local %s, md5 is %s", host, kubeLocal, rMD5)
					logger.Debug("[%s] url is %s, md5 is %s", host, url, uMd5)
					if strings.TrimSpace(rMD5) == strings.TrimSpace(uMd5) {
						logger.Info("[%s]file md5 validate success", host)
					} else {
						logger.Error("[%s]copy file md5 validate failed", host)
					}
				} else {
					if ok := SSHConfig.CopyForMD5(host, url, kubeLocal, ""); ok {
						SSHConfig.Cmd(host, localCmd)
						logger.Info("[%s]file md5 validate success", host)
					} else {
						logger.Error("[%s]file md5 validate failed", host)
					}
				}
			}
			SSHConfig.Cmd(host, kubeCmd)
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
					uMd5 := UrlGetMd5(url)                  //获取url的md5值
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

// RandString 生成随机字符串
func RandString(len int) string {
	var r *rand.Rand
	r = rand.New(rand.NewSource(time.Now().Unix()))
	bytes := make([]byte, len)
	for i := 0; i < len; i++ {
		b := r.Intn(26) + 65
		bytes[i] = byte(b)
	}
	return string(bytes)
}

// Cmp compares two IPs, returning the usual ordering:
// a < b : -1
// a == b : 0
// a > b : 1
func Cmp(a, b net.IP) int {
	aa := ipToInt(a)
	bb := ipToInt(b)
	return aa.Cmp(bb)
}

func ipToInt(ip net.IP) *big.Int {
	if v := ip.To4(); v != nil {
		return big.NewInt(0).SetBytes(v)
	}
	return big.NewInt(0).SetBytes(ip.To16())
}

func intToIP(i *big.Int) net.IP {
	return net.IP(i.Bytes())
}

func stringToIP(i string) net.IP {
	return net.ParseIP(i).To4()
}

// NextIP returns IP incremented by 1
func NextIP(ip net.IP) net.IP {
	i := ipToInt(ip)
	return intToIP(i.Add(i, big.NewInt(1)))
}

// ParseIPs 解析ip 192.168.0.2-192.168.0.6
func ParseIPs(ips []string) []string {
	var hosts []string
	for _, nodes := range ips {
		var startIp, endIp string
		if !strings.Contains(nodes, "-") {
			hosts = append(hosts, nodes)
			continue
		} else {
			// nodes 192.168.0.2-192.168.0.6
			// 1.1.1.1 - 155.155.155.155
			hostSilts := strings.Split(nodes, "-")
			if len(hostSilts) > 2 {
				logger.Error("multi-nodes/multi-masters illegal; host spilt than more two .")
				os.Exit(-1)
			} else {
				startIp = strings.Split(nodes, "-")[0]
				endIp = strings.Split(nodes, "-")[1]
				if len(startIp) < 7 {
					logger.Error("multi-nodes/multi-masters illegal;start host length less 7 , like 1.1.1.1 can used, but not %s .", startIp)
					os.Exit(-1)
				}
				if len(endIp) < 7 {
					logger.Error("multi-nodes/multi-masters illegal;end host length less 7 , like 1.1.1.1 can used, but not s% .", endIp)
					os.Exit(-1)
				}
			}
		}
		//
		port := ":22"
		if strings.Index(endIp, ":") != -1 {
			port = ":" + strings.Split(endIp, ":")[1] //获取endIp
			endIp = strings.Split(endIp, ":")[0]
		}
		hosts = append(hosts, startIp+port)
		for Cmp(stringToIP(startIp), stringToIP(endIp)) < 0 {
			startIp = NextIP(stringToIP(startIp)).String()
			hosts = append(hosts, startIp+port)
		}
	}
	return hosts
}

// like y|yes|Y|YES return true
func GetConfirmResult(str string) bool {
	return YesRx.MatchString(str)
}

// send the prompt and get result
func Confirm(prompt string) bool {
	var (
		inputStr string
		err      error
	)
	_, err = fmt.Fprint(os.Stdout, prompt)
	if err != nil {
		logger.Error("fmt.Fprint err", err)
		os.Exit(-1)
	}

	_, err = fmt.Scanf("%s", &inputStr)
	if err != nil {
		logger.Error("fmt.Scanf err", err)
		os.Exit(-1)
	}

	return GetConfirmResult(inputStr)
}

func SliceRemoveStr(ss []string, s string) (result []string) {
	for _, v := range ss {
		if v != s {
			result = append(result, v)
		}
	}
	return
}

func UrlGetMd5(downloadUrl string) string {
	u, err := url.Parse(downloadUrl)
	if err == nil {
		p := u.Path
		if paths := strings.Split(p, "/"); len(paths) > 2 {
			if paths = strings.Split(paths[1], "-"); len(paths) > 1 {
				return paths[0]
			}
		}
	}
	return ""
}

//判断当前host的hostname
func isHostName(host string) string {
	hostString := SSHConfig.CmdToString(host, "kubectl get nodes | grep -v NAME  | awk '{print $1}'")
	hostString = strings.ReplaceAll(hostString, "\r\n", ",")
	hostName := SSHConfig.CmdToString(host, "hostname")
	hostName = strings.ReplaceAll(hostName, "\r\n", "")
	logger.Debug("hosts %v", hostString)
	hosts := strings.Split(hostString, ",")
	var name string
	for _, h := range hosts {
		if strings.TrimSpace(h) == "" {
			continue
		} else {
			hh := strings.ToLower(h)
			fromH := strings.ToLower(hostName)
			if hh == fromH {
				name = h
				break
			}
		}
	}
	return name
}
