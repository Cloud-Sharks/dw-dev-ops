variable "vpc_name" {
  type        = string
  description = "Name of the VPC"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
}

variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block"
}

variable "public_subnets" {
  type        = list(string)
  description = "Private subnet CIDR blocks"
}

variable "private_subnets" {
  type        = list(string)
  description = "Private subnet CIDR blocks"
}

variable "azs" {
  type        = list(string)
  description = "Avalibility zones"
}

variable "public_subnet_tags" {
  type        = map(string)
  description = "Tags for public subnets"
  default     = {}
}

variable "private_subnet_tags" {
  type        = map(string)
  description = "Tags for private subnets"
  default     = {}
}
