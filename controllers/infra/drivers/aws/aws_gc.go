package aws

import (
	"context"
	"fmt"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"

	"github.com/labring/sealos/test/testdata/api"

	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/aws/aws-sdk-go-v2/config"
	ec2Types "github.com/aws/aws-sdk-go-v2/service/ec2/types"
	"github.com/labring/sealos/controllers/infra/common"
	"github.com/labring/sealos/pkg/utils/logger"
	"golang.org/x/sync/errgroup"

	ec2 "github.com/aws/aws-sdk-go-v2/service/ec2"
)

type GarbageCollector struct {
	k8sClient dynamic.Interface
	ec2Client *ec2.Client
}

// list and delete users' key pair
func (g *GarbageCollector) KeyPairGC() error {
	eg, _ := errgroup.WithContext(context.Background())

	filterKey := fmt.Sprintf("tag:%s", common.KeyPairUser)
	input := &ec2.DescribeKeyPairsInput{
		Filters: []ec2Types.Filter{
			{
				Name:   &filterKey,
				Values: []string{common.KeyPairGeneral},
			},
		},
	}

	result, err := g.ec2Client.DescribeKeyPairs(context.TODO(), input)
	if err != nil {
		return fmt.Errorf("list key pair error:%v", err)
	}

	// delete aws key pair by name concurrently
	for _, v := range result.KeyPairs {
		input := &ec2.DeleteKeyPairInput{
			KeyName: v.KeyName,
		}
		eg.Go(func() error {
			logger.Info("start to delete keypair: %v", *input.KeyName)
			_, err := g.ec2Client.DeleteKeyPair(context.TODO(), input)
			if err != nil {
				return fmt.Errorf("delete key pair error:%v", err)
			}
			return nil
		})
	}

	if err := eg.Wait(); err != nil {
		return err
	}
	return nil
}

func (g *GarbageCollector) InstanceGC() error {
	eg, _ := errgroup.WithContext(context.Background())
	input := &ec2.DescribeInstancesInput{}
	result, err := g.ec2Client.DescribeInstances(context.TODO(), input)
	if err != nil {
		return fmt.Errorf("list instances error:%v", err)
	}

	for _, reservations := range result.Reservations {
		for _, v := range reservations.Instances {
			input := &ec2.StopInstancesInput{
				InstanceIds: []string{*v.InstanceId},
			}
			namespacedName, isValid := parseInstanceTag(v)
			eg.Go(func() error {
				if isValid {
					logger.Info("start to execute instance, namespacedName: %v", *namespacedName)
					gvr := infrav1.GroupVersion.WithResource("infras")
					if _, err := g.k8sClient.Resource(gvr).Namespace(namespacedName.Namespace).Get(context.TODO(), namespacedName.Name, metav1.GetOptions{}); err != nil {
						_, err2 := g.ec2Client.StopInstances(context.TODO(), input)
						if err2 != nil {
							return fmt.Errorf("stop instance error:%v", err)
						}
						logger.Info("stop instance success, namespacedName: %v", *namespacedName)
					}
				}
				return nil
			})
		}
	}

	if err := eg.Wait(); err != nil {
		return err
	}
	return nil
}

func parseInstanceTag(i ec2Types.Instance) (*types.NamespacedName, bool) {
	for _, tag := range i.Tags {
		if *tag.Key == common.InfraInstancesLabel {
			str := strings.Split(*tag.Value, "/")
			if len(str) < 2 {
				return nil, false
			}
			return &types.NamespacedName{
				Namespace: str[0],
				Name:      str[1],
			}, true
		}
	}
	return nil, false
}

func NewGarbageCollector() (*GarbageCollector, error) {
	config, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		return nil, fmt.Errorf("load default config failed %s", err)
	}
	ec2Client := ec2.NewFromConfig(config)
	return &GarbageCollector{
		ec2Client: ec2Client,
		k8sClient: api.GetDefaultDynamicClient(),
	}, nil
}
