resource "aws_s3_bucket" "bucket" {
  bucket_prefix = "${var.bucket_name}-"

  tags = merge({ Name = var.bucket_name }, var.tags)

  force_destroy = true
}

resource "aws_s3_bucket_acl" "acl" {
  bucket = aws_s3_bucket.bucket.id
  acl    = "private"
}

resource "aws_s3_object" "file_objects" {
  for_each = {
    for index, obj in var.file_objects :
    obj.key => obj
  }

  bucket = aws_s3_bucket.bucket.id
  key    = each.value.key
  source = each.value.path
  tags   = var.tags
}
