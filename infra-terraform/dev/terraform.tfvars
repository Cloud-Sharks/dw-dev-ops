environment = "dev"

owner = "David"

region = "us-east-1"

vpc_name = "dw-infra"

vpc_cidr = "10.0.0.0/16"

eks_cluster_name = "dw-eks"

private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]

public_subnets = ["10.0.101.0/24", "10.0.102.0/24"]

azs = ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d"]

bucket_name = "dw-infra"

s3_files = [ "../assets/secret/.microservice.env", "../assets/secret/.eksctl.env" ]

key_name = "dw-us-east-1"

file_secrets = [{
   key = "dw-infra-secret",
   path = "../assets/secret/secret.json"
}, {
    key = "dw-microservice-secrets",
    path = "../assets/secret/secret.microservice.json"
}]

