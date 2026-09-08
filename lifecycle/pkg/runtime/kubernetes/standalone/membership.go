// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"context"
	"fmt"
	"path/filepath"
	"sort"
	"strings"

	"go.etcd.io/etcd/api/v3/etcdserverpb"
	clientv3 "go.etcd.io/etcd/client/v3"
)

func EtcdEndpoints(ctx context.Context) ([]string, error) {
	pod, err := readPod(filepath.Join(manifestDir, "kube-apiserver.yaml"))
	if err != nil {
		return nil, err
	}
	config, err := etcdConfig(pod)
	if err != nil {
		return nil, err
	}
	client, err := clientv3.New(config)
	if err != nil {
		return nil, err
	}
	defer client.Close()
	list, err := client.MemberList(ctx)
	if err != nil {
		return nil, err
	}
	var endpoints []string
	for _, member := range list.Members {
		if !member.IsLearner {
			endpoints = append(endpoints, member.ClientURLs...)
		}
	}
	if len(endpoints) == 0 {
		return nil, fmt.Errorf("etcd has no voting member endpoints")
	}
	sort.Strings(endpoints)
	return endpoints, nil
}

// Membership changes use etcd's published API and identify members by their
// peer URLs. They do not depend on Kubernetes Nodes or mirror Pods.
func memberByPeer(members []*etcdserverpb.Member, peer string) (*etcdserverpb.Member, error) {
	var found *etcdserverpb.Member
	for _, member := range members {
		for _, candidate := range member.PeerURLs {
			if candidate != peer {
				continue
			}
			if found != nil && found.ID != member.ID {
				return nil, fmt.Errorf("multiple etcd members advertise peer URL %s", peer)
			}
			found = member
		}
	}
	return found, nil
}

func initialEtcdCluster(members []*etcdserverpb.Member, joiningID uint64, name string) (string, error) {
	var peers []string
	names := make(map[string]uint64)
	for _, member := range members {
		memberName := member.Name
		if member.ID == joiningID {
			memberName = name
		}
		if memberName == "" || strings.ContainsAny(memberName, ",=") || len(member.PeerURLs) == 0 {
			return "", fmt.Errorf("etcd member %x has no usable name or peer URLs", member.ID)
		}
		if id, exists := names[memberName]; exists && id != member.ID {
			return "", fmt.Errorf("duplicate etcd member name %s", memberName)
		}
		names[memberName] = member.ID
		for _, peer := range member.PeerURLs {
			peers = append(peers, memberName+"="+peer)
		}
	}
	sort.Strings(peers)
	return strings.Join(peers, ","), nil
}

func checkRemovalQuorum(ctx context.Context, client *clientv3.Client, members []*etcdserverpb.Member, removing uint64, clusterID uint64) error {
	remaining, healthy := 0, 0
	for _, member := range members {
		if member.ID == removing || member.IsLearner {
			continue
		}
		remaining++
		for _, endpoint := range member.ClientURLs {
			status, err := client.Status(ctx, endpoint)
			if err == nil && status.Header != nil && status.Header.ClusterId == clusterID &&
				status.Header.MemberId == member.ID && status.Leader != 0 && len(status.Errors) == 0 {
				healthy++
				break
			}
		}
	}
	if remaining == 0 || healthy < remaining/2+1 {
		return fmt.Errorf("etcd removal would leave %d healthy voting members out of %d; a surviving quorum is required", healthy, remaining)
	}
	return nil
}
