resource "aws_secretsmanager_secret" "secret" {
  name                    = "dw-tf-output"
  tags                    = var.tags
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "secret_version" {
  secret_id     = aws_secretsmanager_secret.secret.id
  secret_string = var.vpc_secrets
}
