variable "environment" {
  type        = string
  description = "Deployment Environment"
}

variable "owner" {
  type        = string
  description = "Owner of the project"
}

################################################################################
# VPC
################################################################################

variable "vpc_name" {
  type        = string
  description = "Name for the VPC"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
}

variable "azs" {
  type        = list(string)
  description = "List of availibilty zones"
}

variable "region" {
  type        = string
  description = "Region to deploy services"
}

variable "private_subnets" {
  type        = list(string)
  description = "Private subnet CIDR blocks"
}

variable "public_subnets" {
  type        = list(string)
  description = "Public subnet CIDR blocks"
}

variable "eks_cluster_name" {
  type        = string
  description = "Name of the eks cluster that runs in this VPC"
}

################################################################################
# EC2
################################################################################

variable "ec2_configs" {
  type = map(object({
    name          = string
    ports         = set(number)
    instance_type = string
    volume_size   = number
    domains       = set(string)
  }))
}

variable "key_name" {
  type        = string
  description = "Name of the keypair to use with the created instance"
}

################################################################################
# Route 53
################################################################################

variable "hosted_zone" {
  type        = string
  description = "Value of the zone to host domains in"
}
