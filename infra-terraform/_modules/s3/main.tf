resource "aws_s3_bucket" "bucket" {
  bucket = "${var.bucket_name}-${var.environment}"

  tags = merge({ Name = var.bucket_name }, var.tags)

  force_destroy = true
}

resource "aws_s3_bucket_acl" "acl" {
  bucket = aws_s3_bucket.bucket.id
  acl    = "private"
}
