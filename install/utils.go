package install

import (
	"crypto/tls"
	"fmt"
	"github.com/wonderivan/logger"
	"math/big"
	"math/rand"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const (
	ErrorExitOSCase = -1 // 错误直接退出类型

	ErrorMasterEmpty    = "your master is empty."                 // master节点ip为空
	ErrorVersionEmpty   = "your kubernetes version is empty."     // kubernetes 版本号为空
	ErrorFileNotExist   = "your package file is not exist."       // 离线安装包为空
	ErrorPkgUrlNotExist = "Your package url is incorrect."        // 离线安装包为http路径不对
	ErrorPkgUrlSize     = "Download file size is less then 200M " // 离线安装包为http路径不对
	//ErrorMessageSSHConfigEmpty = "your ssh password or private-key is empty."		// ssh 密码/秘钥为空
	// ErrorMessageCommon											// 其他错误消息

	// MinDownloadFileSize int64 = 400 * 1024 * 1024
)

var message string

// ExitOSCase is
func ExitInitCase() bool {
	// 重大错误直接退出, 不保存配置文件
	if len(MasterIPs) == 0 {
		message = ErrorMasterEmpty
	}
	if Version == "" {
		message += ErrorVersionEmpty
	}
	// 用户不写 --passwd, 默认走pk, 秘钥如果没有配置ssh互信, 则验证ssh的时候报错. 应该属于preRun里面
	// first to auth password, second auth pk.
	// 如果初始状态都没写, 默认都为空. 报这个错
	//if SSHConfig.Password == "" && SSHConfig.PkFile == "" {
	//	message += ErrorMessageSSHConfigEmpty
	//}
	if message != "" {
		logger.Error(message + "please check your command is ok?")
		return true
	}

	return pkgUrlCheck(PkgUrl)
}

func ExitDeleteCase(pkgUrl string) bool {
	if PackageConfig != "" && !FileExist(PackageConfig) {
		logger.Error("your APP pkg-config File is not exist, Please check your pkg-config is exist")
		return true
	}
	return pkgUrlCheck(pkgUrl)
}

func ExitInstallCase(pkgUrl string) bool {
	// values.yaml 使用了-f 但是文件不存在. 并且不使用 stdin
	if Values != "-" && !FileExist(Values) && Values != "" {
		logger.Error("your values File is not exist and you have no stdin input, Please check your Values.yaml is exist")
		return true
	}
	// PackageConfig 使用了-c 但是文件不存在
	if PackageConfig != "" && !FileExist(PackageConfig) {
		logger.Error("your install APP pkg-config File is not exist, Please check your pkg-config is exist")
		return true
	}
	return pkgUrlCheck(pkgUrl)
}

func pkgUrlCheck(pkgUrl string) bool {
	if !strings.HasPrefix(pkgUrl, "http") && !FileExist(pkgUrl) {
		message = ErrorFileNotExist
		logger.Error(message + "please check where your PkgUrl is right?")
		return true
	}
	// 判断PkgUrl, 有http前缀时, 下载的文件如果小于400M ,则报错.
	return strings.HasPrefix(pkgUrl, "http") && !downloadFileCheck(pkgUrl)
}

func downloadFileCheck(pkgUrl string) bool {
	u, err := url.Parse(pkgUrl)
	if err != nil {
		return false
	}
	if u != nil {
		req, err := http.NewRequest("GET", u.String(), nil)
		if err != nil {
			logger.Error(ErrorPkgUrlNotExist, "please check where your PkgUrl is right?")
			return false
		}
		client := &http.Client{
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			},
		}
		resp, err := client.Do(req)
		if err != nil {
			logger.Error(err)
			return false
		}
		if tp := resp.Header.Get("Content-Type"); tp != "application/x-gzip" {
			logger.Error("your pkg url is  a ", tp, "file, please check your PkgUrl is right?")
			return false
		}

		//if resp.ContentLength < MinDownloadFileSize { //判断大小 这里可以设置成比如 400MB 随便设置一个大小
		//	logger.Error("your pkgUrl download file size is : ", resp.ContentLength/1024/1024, "m, please check your PkgUrl is right")
		//	return false
		//}
	}
	return true
}

func FileExist(path string) bool {
	_, err := os.Stat(path)
	return err == nil || os.IsExist(err)
}

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
	if len(ipAndPort) != 2 {
		logger.Error("invalied host fomat [%s], must like 172.0.0.2:22", host)
		os.Exit(1)
	}
	return ipAndPort[0]
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

	if aa == nil || bb == nil {
		logger.Error("ip range %s-%s is invalid", a.String(), b.String())
		os.Exit(-1)
	}
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
	return DecodeIPs(ips)
}

func DecodeIPs(ips []string) []string {
	var res []string
	var port string
	for _, ip := range ips {
		port = "22"
		if ipport := strings.Split(ip, ":"); len(ipport) == 2 {
			ip = ipport[0]
			port = ipport[1]
		}
		if iprange := strings.Split(ip, "-"); len(iprange) == 2 {
			for Cmp(stringToIP(iprange[0]), stringToIP(iprange[1])) <= 0 {
				res = append(res, fmt.Sprintf("%s:%s", iprange[0], port))
				iprange[0] = NextIP(stringToIP(iprange[0])).String()
			}
		} else {
			if stringToIP(ip) == nil {
				logger.Error("ip [%s] is invalid", ip)
				os.Exit(1)
			}
			res = append(res, fmt.Sprintf("%s:%s", ip, port))
		}
	}
	return res
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

//判断当前host的hostname
func isHostName(master, host string) string {
	hostString := SSHConfig.CmdToString(master, "kubectl get nodes | grep -v NAME  | awk '{print $1}'", ",")
	hostName := SSHConfig.CmdToString(host, "hostname", "")
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

func GetRemoteHostName(hostIP string) string {
	hostName := SSHConfig.CmdToString(hostIP, "hostname", "")
	return strings.ToLower(hostName)
}

//获取sealos绝对路径
func FetchSealosAbsPath() string {
	ex, _ := os.Executable()
	exPath := filepath.Dir(ex)
	return exPath + string(os.PathSeparator) + os.Args[0]
}
