package install

import (
	"fmt"
	"github.com/wonderivan/logger"
	"math/big"
	"math/rand"
	"net"
	"os"
	"strconv"
	"strings"
	"time"
)

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
