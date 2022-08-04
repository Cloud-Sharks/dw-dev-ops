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

module "secrets" {
  source      = "../_modules/secrets"
  environment = var.environment
  tags        = local.global_tags
  vpc_secrets = jsonencode({
    vpc_id             = module.vpc.vpc_id,
    public_subnet_ids  = module.vpc.public_subnet_ids,
    private_subnet_ids = module.vpc.private_subnet_ids,
    region             = var.region,
    eks_cluster_name   = var.eks_cluster_name
  })
}

module "ec2" {
  source           = "../_modules/ec2"
  tags             = local.global_tags
  ec2_configs      = var.ec2_configs
  public_subnet_id = module.vpc.public_subnet_ids[0]
  vpc_id           = module.vpc.vpc_id
  key_name         = var.key_name
}

module "route53" {
  source      = "../_modules/route53"
  vpc_id      = module.vpc.vpc_id
  ec2_configs = var.ec2_configs
  hosted_zone = var.hosted_zone

  depends_on = [
    module.ec2
  ]
}
