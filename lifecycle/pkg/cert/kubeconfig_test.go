package cert

import (
	"os"
	"path/filepath"
	"slices"
	"testing"

	"k8s.io/client-go/tools/clientcmd"
	certutil "k8s.io/client-go/util/cert"
)

const kubeVersion129 = "v1.29.0"

func TestRenewAdminKubeConfigFileCreatesAdminConfig(t *testing.T) {
	baseDir := t.TempDir()
	pkiDir := filepath.Join(baseDir, "pki")
	etcdDir := filepath.Join(pkiDir, "etcd")
	outDir := filepath.Join(baseDir, "etc")

	if err := GenerateCert(
		pkiDir,
		etcdDir,
		[]string{"10.96.0.1", "apiserver.test"},
		"192.168.0.10",
		"master0",
		"10.64.0.0/10",
		"cluster.local",
	); err != nil {
		t.Fatalf("GenerateCert() error = %v", err)
	}

	cfg := Config{
		Path:     pkiDir,
		BaseName: "ca",
	}
	endpoint := "https://apiserver.test:6443"

	if err := RenewAdminKubeConfigFile(outDir, cfg, endpoint, "kubernetes", nil); err != nil {
		t.Fatalf("RenewAdminKubeConfigFile() error = %v", err)
	}

	adminConfig, err := clientcmd.LoadFromFile(filepath.Join(outDir, adminKubeConfigFileName))
	if err != nil {
		t.Fatalf("LoadFromFile() error = %v", err)
	}

	authInfo := adminConfig.AuthInfos["kubernetes-admin"]
	if authInfo == nil {
		t.Fatalf("expected kubernetes-admin auth info to exist")
	}

	certs, err := certutil.ParseCertsPEM(authInfo.ClientCertificateData)
	if err != nil {
		t.Fatalf("ParseCertsPEM() error = %v", err)
	}
	if len(certs) == 0 {
		t.Fatalf("expected at least one client certificate")
	}

	if got, want := certs[0].Subject.CommonName, "kubernetes-admin"; got != want {
		t.Fatalf("client certificate common name = %q, want %q", got, want)
	}
	if len(certs[0].Subject.Organization) != 1 || certs[0].Subject.Organization[0] != "system:masters" {
		t.Fatalf("client certificate organizations = %v, want [system:masters]", certs[0].Subject.Organization)
	}

	currentCtx := adminConfig.Contexts[adminConfig.CurrentContext]
	if currentCtx == nil {
		t.Fatalf("expected current context %q to exist", adminConfig.CurrentContext)
	}
	cluster := adminConfig.Clusters[currentCtx.Cluster]
	if cluster == nil {
		t.Fatalf("expected cluster %q to exist", currentCtx.Cluster)
	}
	if got := cluster.Server; got != endpoint {
		t.Fatalf("cluster server = %q, want %q", got, endpoint)
	}
}

func TestRenewAdminKubeConfigFileForV129UsesClusterAdminsGroup(t *testing.T) {
	baseDir := t.TempDir()
	pkiDir := filepath.Join(baseDir, "pki")
	etcdDir := filepath.Join(pkiDir, "etcd")
	outDir := filepath.Join(baseDir, "etc")

	if err := GenerateCertForKubeVersion(
		pkiDir,
		etcdDir,
		[]string{"10.96.0.1", "apiserver.test"},
		"192.168.0.10",
		"master0",
		"10.64.0.0/10",
		"cluster.local",
		kubeVersion129,
	); err != nil {
		t.Fatalf("GenerateCertForKubeVersion() error = %v", err)
	}

	cfg := Config{
		Path:     pkiDir,
		BaseName: "ca",
	}

	if err := RenewAdminKubeConfigFileForKubeVersion(outDir, cfg, "https://apiserver.test:6443", "kubernetes", nil, kubeVersion129); err != nil {
		t.Fatalf("RenewAdminKubeConfigFileForKubeVersion() error = %v", err)
	}

	adminConfig, err := clientcmd.LoadFromFile(filepath.Join(outDir, adminKubeConfigFileName))
	if err != nil {
		t.Fatalf("LoadFromFile() error = %v", err)
	}
	authInfo := adminConfig.AuthInfos["kubernetes-admin"]
	if authInfo == nil {
		t.Fatalf("expected kubernetes-admin auth info to exist")
	}

	certs, err := certutil.ParseCertsPEM(authInfo.ClientCertificateData)
	if err != nil {
		t.Fatalf("ParseCertsPEM() error = %v", err)
	}
	if got, want := certs[0].Subject.Organization, []string{clusterAdminsGroup}; !sameMembers(got, want) {
		t.Fatalf("client certificate organizations = %v, want %v", got, want)
	}
}

func TestCreateJoinControlPlaneKubeConfigFilesForV129CreatesSuperAdmin(t *testing.T) {
	baseDir := t.TempDir()
	pkiDir := filepath.Join(baseDir, "pki")
	etcdDir := filepath.Join(pkiDir, "etcd")
	outDir := filepath.Join(baseDir, "etc")

	if err := GenerateCertForKubeVersion(
		pkiDir,
		etcdDir,
		[]string{"10.96.0.1", "apiserver.test"},
		"192.168.0.10",
		"master0",
		"10.64.0.0/10",
		"cluster.local",
		kubeVersion129,
	); err != nil {
		t.Fatalf("GenerateCertForKubeVersion() error = %v", err)
	}

	cfg := Config{
		Path:     pkiDir,
		BaseName: "ca",
	}

	if err := CreateJoinControlPlaneKubeConfigFilesForKubeVersion(
		outDir,
		cfg,
		"master0",
		"https://apiserver.test:6443",
		"kubernetes",
		kubeVersion129,
	); err != nil {
		t.Fatalf("CreateJoinControlPlaneKubeConfigFilesForKubeVersion() error = %v", err)
	}

	if _, err := os.Stat(filepath.Join(outDir, superAdminKubeConfigFileName)); err != nil {
		t.Fatalf("expected %s to be created: %v", superAdminKubeConfigFileName, err)
	}

	superAdminConfig, err := clientcmd.LoadFromFile(filepath.Join(outDir, superAdminKubeConfigFileName))
	if err != nil {
		t.Fatalf("LoadFromFile(super-admin.conf) error = %v", err)
	}
	authInfo := superAdminConfig.AuthInfos["kubernetes-super-admin"]
	if authInfo == nil {
		t.Fatalf("expected kubernetes-super-admin auth info to exist")
	}

	certs, err := certutil.ParseCertsPEM(authInfo.ClientCertificateData)
	if err != nil {
		t.Fatalf("ParseCertsPEM() error = %v", err)
	}
	if got, want := certs[0].Subject.Organization, []string{legacyPrivilegedGroup}; !sameMembers(got, want) {
		t.Fatalf("super-admin organizations = %v, want %v", got, want)
	}
}

func TestCreateJoinControlPlaneKubeConfigFilesForPre129SkipsSuperAdmin(t *testing.T) {
	baseDir := t.TempDir()
	pkiDir := filepath.Join(baseDir, "pki")
	etcdDir := filepath.Join(pkiDir, "etcd")
	outDir := filepath.Join(baseDir, "etc")

	if err := GenerateCert(
		pkiDir,
		etcdDir,
		[]string{"10.96.0.1", "apiserver.test"},
		"192.168.0.10",
		"master0",
		"10.64.0.0/10",
		"cluster.local",
	); err != nil {
		t.Fatalf("GenerateCert() error = %v", err)
	}

	cfg := Config{
		Path:     pkiDir,
		BaseName: "ca",
	}

	if err := CreateJoinControlPlaneKubeConfigFilesForKubeVersion(
		outDir,
		cfg,
		"master0",
		"https://apiserver.test:6443",
		"kubernetes",
		"v1.28.9",
	); err != nil {
		t.Fatalf("CreateJoinControlPlaneKubeConfigFilesForKubeVersion() error = %v", err)
	}

	if _, err := os.Stat(filepath.Join(outDir, superAdminKubeConfigFileName)); !os.IsNotExist(err) {
		t.Fatalf("expected %s to be absent for pre-v1.29 configs, got err=%v", superAdminKubeConfigFileName, err)
	}
}

func TestRenewAdminKubeConfigFileOverwritesExistingAdminConfig(t *testing.T) {
	baseDir := t.TempDir()
	pkiDir := filepath.Join(baseDir, "pki")
	etcdDir := filepath.Join(pkiDir, "etcd")
	outDir := filepath.Join(baseDir, "etc")

	if err := GenerateCert(
		pkiDir,
		etcdDir,
		[]string{"10.96.0.1", "apiserver.test"},
		"192.168.0.10",
		"master0",
		"10.64.0.0/10",
		"cluster.local",
	); err != nil {
		t.Fatalf("GenerateCert() error = %v", err)
	}

	cfg := Config{
		Path:     pkiDir,
		BaseName: "ca",
	}

	if err := CreateJoinControlPlaneKubeConfigFiles(
		outDir,
		cfg,
		"master0",
		"https://old-apiserver.test:6443",
		"kubernetes",
	); err != nil {
		t.Fatalf("CreateJoinControlPlaneKubeConfigFiles() error = %v", err)
	}

	oldConfig, err := clientcmd.LoadFromFile(filepath.Join(outDir, adminKubeConfigFileName))
	if err != nil {
		t.Fatalf("LoadFromFile() before renew error = %v", err)
	}
	oldAuthInfo := oldConfig.AuthInfos["kubernetes-admin"]
	if oldAuthInfo == nil {
		t.Fatalf("expected kubernetes-admin auth info before renew")
	}

	newEndpoint := "https://new-apiserver.test:6443"
	if err := RenewAdminKubeConfigFile(outDir, cfg, newEndpoint, "kubernetes", nil); err != nil {
		t.Fatalf("RenewAdminKubeConfigFile() error = %v", err)
	}

	newConfig, err := clientcmd.LoadFromFile(filepath.Join(outDir, adminKubeConfigFileName))
	if err != nil {
		t.Fatalf("LoadFromFile() after renew error = %v", err)
	}
	newAuthInfo := newConfig.AuthInfos["kubernetes-admin"]
	if newAuthInfo == nil {
		t.Fatalf("expected kubernetes-admin auth info after renew")
	}

	if string(oldAuthInfo.ClientCertificateData) == string(newAuthInfo.ClientCertificateData) {
		t.Fatalf("expected renewed admin kubeconfig to contain a different client certificate")
	}

	currentCtx := newConfig.Contexts[newConfig.CurrentContext]
	if currentCtx == nil {
		t.Fatalf("expected current context %q to exist", newConfig.CurrentContext)
	}
	cluster := newConfig.Clusters[currentCtx.Cluster]
	if cluster == nil {
		t.Fatalf("expected cluster %q to exist", currentCtx.Cluster)
	}
	if got := cluster.Server; got != newEndpoint {
		t.Fatalf("cluster server = %q, want %q", got, newEndpoint)
	}
}

func TestRenewKubeConfigFilesOverwritesSelectedConfigs(t *testing.T) {
	baseDir := t.TempDir()
	pkiDir := filepath.Join(baseDir, "pki")
	etcdDir := filepath.Join(pkiDir, "etcd")
	outDir := filepath.Join(baseDir, "etc")

	if err := GenerateCert(
		pkiDir,
		etcdDir,
		[]string{"10.96.0.1", "apiserver.test"},
		"192.168.0.10",
		"master0",
		"10.64.0.0/10",
		"cluster.local",
	); err != nil {
		t.Fatalf("GenerateCert() error = %v", err)
	}

	cfg := Config{
		Path:     pkiDir,
		BaseName: "ca",
	}

	if err := CreateJoinControlPlaneKubeConfigFiles(
		outDir,
		cfg,
		"master0",
		"https://old-apiserver.test:6443",
		"kubernetes",
	); err != nil {
		t.Fatalf("CreateJoinControlPlaneKubeConfigFiles() error = %v", err)
	}

	if err := RenewKubeConfigFiles(
		outDir,
		cfg,
		"master0",
		"https://new-apiserver.test:6443",
		"kubernetes",
		nil,
		controllerManagerKubeConfigFileName,
		schedulerKubeConfigFileName,
	); err != nil {
		t.Fatalf("RenewKubeConfigFiles() error = %v", err)
	}

	for _, name := range []string{controllerManagerKubeConfigFileName, schedulerKubeConfigFileName} {
		kubeConfig, err := clientcmd.LoadFromFile(filepath.Join(outDir, name))
		if err != nil {
			t.Fatalf("LoadFromFile(%q) error = %v", name, err)
		}
		currentCtx := kubeConfig.Contexts[kubeConfig.CurrentContext]
		if currentCtx == nil {
			t.Fatalf("expected current context %q to exist for %s", kubeConfig.CurrentContext, name)
		}
		cluster := kubeConfig.Clusters[currentCtx.Cluster]
		if cluster == nil {
			t.Fatalf("expected cluster %q to exist for %s", currentCtx.Cluster, name)
		}
		if got := cluster.Server; got != "https://new-apiserver.test:6443" {
			t.Fatalf("%s cluster server = %q, want %q", name, got, "https://new-apiserver.test:6443")
		}
	}
}

func TestRenewAdminKubeConfigFileAllowsCustomOrganizations(t *testing.T) {
	baseDir := t.TempDir()
	pkiDir := filepath.Join(baseDir, "pki")
	etcdDir := filepath.Join(pkiDir, "etcd")
	outDir := filepath.Join(baseDir, "etc")

	if err := GenerateCert(
		pkiDir,
		etcdDir,
		[]string{"10.96.0.1", "apiserver.test"},
		"192.168.0.10",
		"master0",
		"10.64.0.0/10",
		"cluster.local",
	); err != nil {
		t.Fatalf("GenerateCert() error = %v", err)
	}

	cfg := Config{
		Path:     pkiDir,
		BaseName: "ca",
	}

	if err := RenewAdminKubeConfigFile(outDir, cfg, "https://apiserver.test:6443", "kubernetes", []string{"platform:devs", "platform:ops"}); err != nil {
		t.Fatalf("RenewAdminKubeConfigFile() error = %v", err)
	}

	adminConfig, err := clientcmd.LoadFromFile(filepath.Join(outDir, adminKubeConfigFileName))
	if err != nil {
		t.Fatalf("LoadFromFile() error = %v", err)
	}
	authInfo := adminConfig.AuthInfos["kubernetes-admin"]
	if authInfo == nil {
		t.Fatalf("expected kubernetes-admin auth info to exist")
	}

	certs, err := certutil.ParseCertsPEM(authInfo.ClientCertificateData)
	if err != nil {
		t.Fatalf("ParseCertsPEM() error = %v", err)
	}
	if got, want := slices.Clone(certs[0].Subject.Organization), []string{"platform:devs", "platform:ops"}; !sameMembers(got, want) {
		t.Fatalf("client certificate organizations = %v, want %v", got, want)
	}
}

func TestRenewAdminKubeConfigFileAllowsEmptyOrganizations(t *testing.T) {
	baseDir := t.TempDir()
	pkiDir := filepath.Join(baseDir, "pki")
	etcdDir := filepath.Join(pkiDir, "etcd")
	outDir := filepath.Join(baseDir, "etc")

	if err := GenerateCert(
		pkiDir,
		etcdDir,
		[]string{"10.96.0.1", "apiserver.test"},
		"192.168.0.10",
		"master0",
		"10.64.0.0/10",
		"cluster.local",
	); err != nil {
		t.Fatalf("GenerateCert() error = %v", err)
	}

	cfg := Config{
		Path:     pkiDir,
		BaseName: "ca",
	}

	if err := RenewAdminKubeConfigFile(outDir, cfg, "https://apiserver.test:6443", "kubernetes", []string{}); err != nil {
		t.Fatalf("RenewAdminKubeConfigFile() error = %v", err)
	}

	adminConfig, err := clientcmd.LoadFromFile(filepath.Join(outDir, adminKubeConfigFileName))
	if err != nil {
		t.Fatalf("LoadFromFile() error = %v", err)
	}
	authInfo := adminConfig.AuthInfos["kubernetes-admin"]
	if authInfo == nil {
		t.Fatalf("expected kubernetes-admin auth info to exist")
	}

	certs, err := certutil.ParseCertsPEM(authInfo.ClientCertificateData)
	if err != nil {
		t.Fatalf("ParseCertsPEM() error = %v", err)
	}
	if len(certs[0].Subject.Organization) != 0 {
		t.Fatalf("client certificate organizations = %v, want none", certs[0].Subject.Organization)
	}
}

func sameMembers(got, want []string) bool {
	if len(got) != len(want) {
		return false
	}
	slices.Sort(got)
	want = slices.Clone(want)
	slices.Sort(want)
	return slices.Equal(got, want)
}
