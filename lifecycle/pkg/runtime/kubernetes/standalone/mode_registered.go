// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"os"
	"strings"
	"time"

	certificatesv1 "k8s.io/api/certificates/v1"
	v1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/client-go/util/certificate"
	"k8s.io/client-go/util/certificate/csr"
	"k8s.io/client-go/util/retry"
)

const modeOriginAnnotation = "sealos.io/control-plane-mode-origin"
const modeRegistrationTaint = "sealos.io/control-plane-mode"

func (m *modeSwitch) toRegistered(ctx context.Context) error {
	if err := m.checkRegisteredIdentity(ctx); err != nil {
		return err
	}
	// Obtain new kubelet credentials through the public CSR API before stopping
	// the standalone control plane, including when an external signer is used.
	config, certData, keyData, err := m.registeredCredentials(ctx)
	if err != nil {
		return err
	}
	if err := m.command(ctx, "stop", "kubelet"); err != nil {
		return err
	}
	if err := m.stopController(ctx); err != nil {
		return err
	}
	if err := removeReservedRoutes(m.state.RouteTable, m.state.RouteProtocol); err != nil {
		return err
	}
	if previous := m.state.ControllerUpdate; previous != nil {
		if err := removeReservedRoutes(previous.PreviousTable, previous.PreviousProtocol); err != nil {
			return err
		}
	}
	data, err := os.ReadFile(m.state.ConfigPath)
	if err != nil {
		return err
	}
	data, _, err = convertKubeletConfig(data, m.state.Settings)
	if err != nil {
		return err
	}
	if err := atomicModeFile(m.state.ConfigPath, data, 0o600); err != nil {
		return err
	}
	certDir := flagValue(m.state.Args, "cert-dir")
	if certDir == "" {
		certDir = "/var/lib/kubelet/pki"
	}
	store, err := certificate.NewFileStore("kubelet-client", certDir, certDir, "", "")
	if err != nil {
		return err
	}
	if _, err := store.Update(certData, keyData); err != nil {
		return err
	}
	for _, auth := range config.AuthInfos {
		auth.ClientCertificate = store.CurrentPath()
		auth.ClientKey = store.CurrentPath()
		auth.ClientCertificateData = nil
		auth.ClientKeyData = nil
	}
	data, err = clientcmd.Write(*config)
	if err != nil {
		return err
	}
	if err := atomicModeFile(m.state.KubeconfigPath, data, 0o600); err != nil {
		return err
	}
	args := registeredModeArgs(m.state.Args, m.state.Node)
	if err := atomicModeFile(modeDropin, []byte(serviceOverride(args)), 0o644); err != nil {
		return err
	}
	if err := m.command(ctx, "daemon-reload"); err != nil {
		return err
	}
	if err := m.command(ctx, "start", "kubelet"); err != nil {
		return err
	}
	if err := wait.PollUntilContextCancel(ctx, time.Second, true, func(ctx context.Context) (bool, error) {
		err := m.restoreNode(ctx)
		if apierrors.IsNotFound(err) {
			return false, nil
		}
		return err == nil, err
	}); err != nil {
		return err
	}
	if err := m.waitReady(ctx); err != nil {
		return err
	}
	if m.state.ManagedService {
		if err := atomicModeFile(registeredDropin, []byte(serviceOverride(m.state.Args)), 0o644); err != nil {
			return err
		}
	}
	if err := os.Remove(modeDropin); err != nil && !os.IsNotExist(err) {
		return err
	}
	if err := m.command(ctx, "daemon-reload"); err != nil {
		return err
	}
	if err := m.command(ctx, "restart", "kubelet"); err != nil {
		return err
	}
	return m.waitReady(ctx)
}

func registeredModeArgs(args []string, node *v1.Node) []string {
	var result []string
	for i := 0; i < len(args); i++ {
		name := strings.SplitN(args[i], "=", 2)[0]
		if name == "--register-node" || name == "--register-with-taints" {
			if !strings.Contains(args[i], "=") && i+1 < len(args) && !strings.HasPrefix(args[i+1], "--") {
				i++
			}
			continue
		}
		result = append(result, args[i])
	}
	taints := []string{modeRegistrationTaint + "=" + string(node.UID) + ":NoSchedule"}
	for _, taint := range restoredNode(node).Spec.Taints {
		taints = append(taints, taint.ToString())
	}
	return append(result, "--register-node=true", "--register-with-taints="+strings.Join(taints, ","))
}

func (m *modeSwitch) registeredCredentials(ctx context.Context) (*clientcmdapi.Config, []byte, []byte, error) {
	config, err := clientcmd.Load(m.state.Kubeconfig)
	if err != nil {
		return nil, nil, nil, err
	}
	if err := clientcmdapi.MinifyConfig(config); err != nil {
		return nil, nil, nil, err
	}
	// Keep only the original API endpoint and trust configuration. In particular,
	// do not depend on the saved client certificate still existing or being valid.
	contextConfig := config.Contexts[config.CurrentContext]
	config.AuthInfos[contextConfig.AuthInfo] = &clientcmdapi.AuthInfo{}
	if err := clientcmdapi.FlattenConfig(config); err != nil {
		return nil, nil, nil, err
	}
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, nil, nil, err
	}
	request, err := x509.CreateCertificateRequest(rand.Reader, &x509.CertificateRequest{
		Subject: pkix.Name{
			CommonName:   "system:node:" + m.state.Node.Name,
			Organization: []string{"system:nodes"},
		},
	}, key)
	if err != nil {
		return nil, nil, nil, err
	}
	requestPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "CERTIFICATE REQUEST",
		Bytes: request,
	})
	object, err := m.client.CertificatesV1().CertificateSigningRequests().Create(ctx, &certificatesv1.CertificateSigningRequest{
		ObjectMeta: metav1.ObjectMeta{
			GenerateName: "sealos-kubelet-",
		},
		Spec: certificatesv1.CertificateSigningRequestSpec{
			Request:    requestPEM,
			SignerName: certificatesv1.KubeAPIServerClientKubeletSignerName,
			Usages: []certificatesv1.KeyUsage{
				certificatesv1.UsageDigitalSignature,
				certificatesv1.UsageClientAuth,
			},
		},
	}, metav1.CreateOptions{})
	if err != nil {
		return nil, nil, nil, err
	}
	defer func() {
		cleanupCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = m.client.CertificatesV1().CertificateSigningRequests().Delete(cleanupCtx, object.Name, metav1.DeleteOptions{
			Preconditions: &metav1.Preconditions{
				UID: &object.UID,
			},
		})
	}()
	if err := m.approveKubeletCSR(ctx, object); err != nil {
		return nil, nil, nil, err
	}
	certData, err := csr.WaitForCertificate(ctx, m.client, object.Name, object.UID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("kubelet CSR signer did not issue a certificate: %w", err)
	}
	encodedKey, err := x509.MarshalECPrivateKey(key)
	if err != nil {
		return nil, nil, nil, err
	}
	keyData := pem.EncodeToMemory(&pem.Block{
		Type:  "EC PRIVATE KEY",
		Bytes: encodedKey,
	})
	pair, err := tls.X509KeyPair(certData, keyData)
	if err != nil {
		return nil, nil, nil, err
	}
	leaf, err := x509.ParseCertificate(pair.Certificate[0])
	if err != nil {
		return nil, nil, nil, err
	}
	if leaf.Subject.CommonName != "system:node:"+m.state.Node.Name || len(leaf.Subject.Organization) != 1 || leaf.Subject.Organization[0] != "system:nodes" || time.Until(leaf.NotAfter) < time.Hour {
		return nil, nil, nil, fmt.Errorf("signer returned an invalid kubelet identity or certificate lifetime")
	}
	return config, certData, keyData, nil
}

func (m *modeSwitch) approveKubeletCSR(ctx context.Context, request *certificatesv1.CertificateSigningRequest) error {
	requests := m.client.CertificatesV1().CertificateSigningRequests()
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		latest, err := requests.Get(ctx, request.Name, metav1.GetOptions{})
		if err != nil {
			return err
		}
		if latest.UID != request.UID {
			return fmt.Errorf("kubelet CSR identity changed before approval")
		}
		approved := false
		for _, condition := range latest.Status.Conditions {
			if condition.Status != v1.ConditionTrue {
				continue
			}
			switch condition.Type {
			case certificatesv1.CertificateDenied, certificatesv1.CertificateFailed:
				return fmt.Errorf("kubelet CSR was %s: %s", condition.Type, condition.Message)
			case certificatesv1.CertificateApproved:
				approved = true
			}
		}
		if approved {
			return nil
		}
		latest.Status.Conditions = append(latest.Status.Conditions, certificatesv1.CertificateSigningRequestCondition{
			Type:           certificatesv1.CertificateApproved,
			Status:         v1.ConditionTrue,
			Reason:         "SealosControlPlaneMode",
			Message:        "Administrator requested registered control-plane mode",
			LastUpdateTime: metav1.Now(),
		})
		_, err = requests.UpdateApproval(ctx, latest.Name, latest, metav1.UpdateOptions{})
		return err
	})
}

func restoredNode(original *v1.Node) *v1.Node {
	node := &v1.Node{
		ObjectMeta: metav1.ObjectMeta{
			Name:        original.Name,
			Labels:      make(map[string]string),
			Annotations: make(map[string]string),
		},
		Spec: v1.NodeSpec{
			ProviderID: original.Spec.ProviderID,
		},
	}
	for key, value := range original.Labels {
		node.Labels[key] = value
	}
	for key, value := range original.Annotations {
		node.Annotations[key] = value
	}
	node.Annotations[modeOriginAnnotation] = string(original.UID)
	for _, taint := range original.Spec.Taints {
		if taint.Key == v1.TaintNodeNotReady || taint.Key == v1.TaintNodeUnreachable {
			continue
		}
		node.Spec.Taints = append(node.Spec.Taints, taint)
	}
	return node
}

func (m *modeSwitch) restoreNode(ctx context.Context) error {
	wanted := restoredNode(m.state.Node)
	var node *v1.Node
	err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		current, err := m.client.CoreV1().Nodes().Get(ctx, wanted.Name, metav1.GetOptions{})
		if err != nil {
			return err
		}
		if !m.ownsRegisteredNode(current) {
			return fmt.Errorf("refusing to adopt a different Node with the same name")
		}
		if current.DeletionTimestamp != nil {
			return fmt.Errorf("old Node is still terminating")
		}
		if current.Spec.ProviderID == "" {
			current.Spec.ProviderID = wanted.Spec.ProviderID
		}
		if current.Labels == nil {
			current.Labels = make(map[string]string)
		}
		if current.Annotations == nil {
			current.Annotations = make(map[string]string)
		}
		for key, value := range wanted.Labels {
			current.Labels[key] = value
		}
		for key, value := range wanted.Annotations {
			current.Annotations[key] = value
		}
		var taints []v1.Taint
		for _, taint := range current.Spec.Taints {
			if taint.Key != modeRegistrationTaint {
				taints = append(taints, taint)
			}
		}
		for _, saved := range wanted.Spec.Taints {
			found := false
			for _, existing := range taints {
				if existing.Key == saved.Key && existing.Effect == saved.Effect {
					found = true
				}
			}
			if !found {
				taints = append(taints, saved)
			}
		}
		current.Spec.Taints = taints
		node, err = m.client.CoreV1().Nodes().Update(ctx, current, metav1.UpdateOptions{})
		return err
	})
	if err != nil {
		return err
	}
	m.state.RegisteredUID = node.UID
	return m.save()
}

func (m *modeSwitch) ownsRegisteredNode(node *v1.Node) bool {
	if node.UID == m.state.RegisteredUID || node.Annotations[modeOriginAnnotation] == string(m.state.Node.UID) {
		return true
	}
	for _, taint := range node.Spec.Taints {
		if taint.Key == modeRegistrationTaint && taint.Value == string(m.state.Node.UID) && taint.Effect == v1.TaintEffectNoSchedule {
			return true
		}
	}
	return false
}

func (m *modeSwitch) checkRegisteredIdentity(ctx context.Context) error {
	node, err := m.client.CoreV1().Nodes().Get(ctx, m.state.Node.Name, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		return nil
	}
	if err != nil {
		return err
	}
	if !m.ownsRegisteredNode(node) {
		return fmt.Errorf("a different Node already uses the control-plane name")
	}
	return nil
}
