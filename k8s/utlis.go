package k8s

import (
	"strings"
)

func getHostnameAndIp(node []string) ([]string, []string) {
	var resHost, resIp []string
	if len(node) == 0 {
		return node, node
	}
	for _, n := range node {
		if !IsIpv4(n) {
			resHost = append(resHost, n)
		} else {
			resIp = append(resIp, n)
		}
	}
	return resHost, resIp
}

func IsIpv4(ip string) bool {
	//matched, _ := regexp.MatchString("((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})(\\.((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})){3}", ip)

	arr := strings.Split(ip, ".")
	if len(arr) != 4 {
		return false
	}
	for _, v := range arr {
		if v == "" {
			return false
		}
		if len(v) > 1 && v[0] == '0' {
			return false
		}
		num := 0
		for _, c := range v {
			if c >= '0' && c <= '9' {
				num = num*10 + int(c-'0')
			} else {
				return false
			}
		}
		if num > 255 {
			return false
		}
	}
	return true
}

// remove is remove b in a []string
func remove(a []string, b string) []string {
	if len(a) == 0 {
		return a
	}
	for i, v := range a {
		if v == b {
			a = append(a[:i], a[i+1:]...)
			return remove(a, b)
		}
	}
	return a
}

// removeRep is Deduplication []string
func removeRep(a []string) []string {
	if len(a) == 0 {
		return a
	}
	res := make([]string, 0, len(a))
	tmp := map[string]struct{}{}
	for _, v := range a {
		if _, ok := tmp[v]; !ok {
			tmp[v] = struct{}{}
			res = append(res, v)
		}
	}
	return res
}
