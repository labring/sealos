package install

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"crypto/tls"
	"fmt"
	"github.com/wonderivan/logger"
	"io"
	"math/big"
	"math/rand"
	"net"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"time"
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

func CompressTar(srcDirPath string, destFilePath string) error {
	fw, err := os.Create(destFilePath)
	if err != nil {
		return err
	}
	defer fw.Close()

	gw := gzip.NewWriter(fw)
	defer gw.Close()

	tw := tar.NewWriter(gw)
	defer tw.Close()

	f, err := os.Open(srcDirPath)
	if err != nil {
		return err
	}
	fi, err := f.Stat()
	if err != nil {
		return err
	}
	if fi.IsDir() {
		err = compressDir(srcDirPath, path.Base(srcDirPath), tw)
		if err != nil {
			return err
		}
	} else {
		err := compressFile(srcDirPath, fi.Name(), tw, fi)
		if err != nil {
			return err
		}
	}
	return nil
}

func compressDir(srcDirPath string, recPath string, tw *tar.Writer) error {
	dir, err := os.Open(srcDirPath)
	if err != nil {
		return err
	}
	defer dir.Close()

	fis, err := dir.Readdir(0)
	if err != nil {
		return err
	}
	for _, fi := range fis {
		curPath := srcDirPath + "/" + fi.Name()

		if fi.IsDir() {
			err = compressDir(curPath, recPath+"/"+fi.Name(), tw)
			if err != nil {
				return err
			}
		}

		err = compressFile(curPath, recPath+"/"+fi.Name(), tw, fi)
		if err != nil {
			return err
		}
	}
	return nil
}

func compressFile(srcFile string, recPath string, tw *tar.Writer, fi os.FileInfo) error {
	if fi.IsDir() {
		hdr := new(tar.Header)
		hdr.Name = recPath + "/"
		hdr.Typeflag = tar.TypeDir
		hdr.Size = 0
		hdr.Mode = int64(fi.Mode())
		hdr.ModTime = fi.ModTime()

		err := tw.WriteHeader(hdr)
		if err != nil {
			return err
		}
	} else {
		fr, err := os.Open(srcFile)
		if err != nil {
			return err
		}
		defer fr.Close()

		hdr := new(tar.Header)
		hdr.Name = recPath
		hdr.Size = fi.Size()
		hdr.Mode = int64(fi.Mode())
		hdr.ModTime = fi.ModTime()

		err = tw.WriteHeader(hdr)
		if err != nil {
			return err
		}

		_, err = io.Copy(tw, fr)
		if err != nil {
			return err
		}
	}
	return nil
}

// CompressZip is  compress all file in fileDir , and zip to outputPath like unix  zip ./ -r  a.zip
func CompressZip(fileDir string, outputPath string) error {
	outFile, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer outFile.Close()
	w := zip.NewWriter(outFile)
	defer w.Close()

	return filepath.Walk(fileDir, func(path string, f os.FileInfo, err error) error {
		if f == nil {
			return err
		}
		if f.IsDir() {
			return nil
		}
		rel, _ := filepath.Rel(fileDir, path)
		fmt.Println(rel, path)
		compress(rel, path, w)
		return nil
	})

}

func compress(rel string, path string, zw *zip.Writer) {
	file, _ := os.Open(path)
	info, _ := file.Stat()
	header, _ := zip.FileInfoHeader(info)
	header.Name = rel
	writer, _ := zw.CreateHeader(header)
	io.Copy(writer, file)
	defer file.Close()
}
