// Reference this later
// https://github.com/gruntwork-io/terratest/blob/master/test/terraform_ssh_example_test.go

package terratest

import (
	"testing"

	"github.com/gruntwork-io/terratest/modules/aws"
	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
)

var terraformOptions *terraform.Options

func init() {
	terraformDir := "../infra-terraform/dev"

	tfOptions := terraform.WithDefaultRetryableErrors(&testing.T{}, &terraform.Options{
		TerraformDir: terraformDir,
	})

	terraformOptions = tfOptions

	terraform.InitAndApply(&testing.T{}, tfOptions)
}

func TestSubnetCount(t *testing.T) {
	vpcId := terraform.Output(t, terraformOptions, "vpc_id")
	region := terraform.Output(t, terraformOptions, "region")
	subnets := aws.GetSubnetsForVpc(t, vpcId, region)

	expectedSubnetCount := 4
	actualSubnetCount := len(subnets)

	assert.Equal(t, expectedSubnetCount, actualSubnetCount)
}

func TestPublicSubnets(t *testing.T) {
	region := terraform.Output(t, terraformOptions, "region")
	publicSubnets := terraform.OutputList(t, terraformOptions, "public_subnet_ids")

	for _, subnetId := range publicSubnets {
		assert.True(t, aws.IsPublicSubnet(t, subnetId, region))
	}
}

func TestPrivateSubnet(t *testing.T) {
		region := terraform.Output(t, terraformOptions, "region")
	publicSubnets := terraform.OutputList(t, terraformOptions, "private_subnet_ids")

	for _, subnetId := range publicSubnets {
		assert.False(t, aws.IsPublicSubnet(t, subnetId, region))
	}
}

