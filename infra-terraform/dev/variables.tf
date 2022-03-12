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

################################################################################
# S3
################################################################################
variable "bucket_name" {
  type        = string
  description = "Name of the S3 bucket"
}

################################################################################
# Secrets
################################################################################
variable "secret_key" {
  type        = string
  description = "Key of the secret to create"
}

variable "secret_json" {
  type        = string
  description = "Path to the json secret to store"
}
