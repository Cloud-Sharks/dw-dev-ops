environment = "dev"

owner = "David"

region = "us-east-1"

vpc_name = "dw-infra"

vpc_cidr = "10.0.0.0/16"

private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]

public_subnets = ["10.0.101.0/24", "10.0.102.0/24"]

azs = ["us-east-1a", "us-east-1b", "us-east-1c", "us-east-1d"]

bucket_name = "dw-infra"

file_objects = [{
    key = ".ecs.env",
    path = "../assets/secret/.ecsctl.env"
}, {
    key = ".eks.env",
    path = "../assets/secret/.eksctl.env"
}]

secret_key = "dw-infra-secret"

secret_json = "../assets/secret/secret.json"
