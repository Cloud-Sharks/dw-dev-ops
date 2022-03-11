variable "environment" {
  type        = string
  description = "Deployment Environment"
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "secrets" {
  type        = list(string)
  description = "Secrets to generate"
}
