provider "aws" {
  profile = "default"
  region  = var.region
}

locals {
  global_tags = {
    Environment = var.environment
    Owner       = var.owner
  }
}

module "vpc" {
  source          = "../_modules/vpc"
  environment     = var.environment
  vpc_name        = var.vpc_name
  vpc_cidr        = var.vpc_cidr
  public_subnets  = var.public_subnets
  private_subnets = var.private_subnets
  azs             = var.azs

  private_subnet_tags = merge({
    "kubernetes.io/role/internal-elb" : 1
    "kubernetes.io/cluster/${var.eks_cluster_name}" : "owned",
    },
    local.global_tags
  )

  public_subnet_tags = merge({
    "kubernetes.io/role/elb" : 1
    },
    local.global_tags
  )
}

module "security_groups" {
  source = "../_modules/security-groups"
  vpc_id = module.vpc.vpc_id
  tags   = local.global_tags
}

module "s3" {
  source      = "../_modules/s3"
  bucket_name = var.bucket_name
  file_paths  = var.s3_files
  environment = var.environment
  tags        = local.global_tags
}

module "secrets" {
  source       = "../_modules/secrets"
  file_secrets = var.file_secrets
  environment  = var.environment
  tags         = local.global_tags
}

module "bastion" {
  source             = "../_modules/bastion"
  private_subnet_id  = element(module.vpc.private_subnet_ids, 0)
  public_subnet_id   = element(module.vpc.public_subnet_ids, 0)
  security_group_ids = module.security_groups.security_group_ids
  key_name           = var.key_name
  tags               = local.global_tags
}
