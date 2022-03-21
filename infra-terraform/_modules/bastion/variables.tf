variable "instance_type" {
  type        = string
  description = "Instance type"
  default     = "t2.nano"
}

variable "public_subnet_id" {
  type        = string
  description = "Public Subnet"
}

variable "private_subnet_id" {
  type        = string
  description = "Private Subnet"
}

variable "key_name" {
  type        = string
  description = "Name of the key pair to ssh into instances with"
}

variable "security_group_ids" {
  type        = list(string)
  description = "List of security group ids to attach to bastion"
}

variable "tags" {
  type    = map(string)
  default = {}
}
