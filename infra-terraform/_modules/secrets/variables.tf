variable "environment" {
  type        = string
  description = "Deployment Environment"
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "vpc_secrets" {
  type        = string
  description = "Vpc structure"
}
