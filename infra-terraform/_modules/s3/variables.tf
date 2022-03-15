variable "bucket_name" {
  type        = string
  description = "Name of the bucket"
}

variable "environment" {
  type        = string
  description = "Deployment Environment"
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "file_paths" {
  type = list(string)
}
