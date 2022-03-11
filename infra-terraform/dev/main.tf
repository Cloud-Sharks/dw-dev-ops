provider "aws" {
  profile = "default"
  region  = var.region
}

locals {
  global_tags = {
    Environment = var.environment
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

  private_subnet_tags = local.global_tags
  public_subnet_tags  = local.global_tags
}

module "security_groups" {
  source = "../_modules/security-groups"
  vpc_id = module.vpc.vpc_id
  tags   = local.global_tags
}

module "s3" {
  source      = "../_modules/s3"
  bucket_name = var.bucket_name
  environment = var.environment
  tags        = local.global_tags
}

module "secrets" {
  source  = "../_modules/secrets"
  secrets = var.secrets
}
