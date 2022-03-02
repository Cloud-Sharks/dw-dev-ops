region = "us-east-2"

vpc_name = "dw-infra"

vpc_cidr = "10.0.0.0/16"

private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]

public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

azs = ["us-east-2a", "us-east-2b"]

key_name = "dw-keypair"

bucket_name = "dw-infra-bucket"

environment = "production"