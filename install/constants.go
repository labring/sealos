package install

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

	// etcd backup
	ETCDSNAPSHOTDEFAULTNAME = "snapshot"
	ETCDDEFAULTBACKUPDIR    = "/opt/sealos/ectd-backup"
	ETCDDEFAULTRESTOREDIR	= "/opt/sealos/ectd-restore"
	ETCDDATADIR				= "/var/lib/etcd"
	EtcdCacart              = "/root/.sealos/pki/etcd/ca.crt"
	EtcdCert                = "/root/.sealos/pki/etcd/healthcheck-client.crt"
	EtcdKey                 = "/root/.sealos/pki/etcd/healthcheck-client.key"
	TMPDIR                  = "/tmp"
)
