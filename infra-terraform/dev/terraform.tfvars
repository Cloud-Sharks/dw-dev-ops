environment = "dev"

owner = "David"

region = "us-east-1"

vpc_name = "dw-infra"

vpc_cidr = "10.0.0.0/16"

eks_cluster_name = "dw-eks"

private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]

public_subnets = ["10.0.101.0/24", "10.0.102.0/24"]

azs = ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d"]

key_name = "dw-us-east-1"

ec2_configs = {
  bastion = {
    name          = "**DW-Bastion"
    ports         = [22,80]
    instance_type = "t2.nano"
    is_public     = true
    volume_size   = 8
  }
  artifactory = {
    name          = "**DW-Artifactory"
    ports         = [22,80,443]
    instance_type = "t2.nano"
    # instance_type = "t3a.large"
    is_public     = true
    volume_size   = 8
  }
  awx = {
    name          = "**DW-AWX"
    ports         = [22,80],
    instance_type = "t2.nano"
    # instance_type = "t2.medium"
    is_public     = true
    volume_size   = 8
  }
  elastic = {
    name          = "**DW-Elastic"
    ports         = [22,80],
    instance_type = "t2.nano"
    # instance_type = "t3a.large"
    is_public     = true
    volume_size   = 8
  }
}
