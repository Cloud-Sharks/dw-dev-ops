variable "environment" {
  type        = string
  description = "Deployment Environment"
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "file_secrets" {
  type = list(object({
    key  = string
    path = string
  }))
  description = "Secret key and file path"
}
