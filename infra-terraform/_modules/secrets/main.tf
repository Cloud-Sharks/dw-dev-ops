resource "aws_secretsmanager_secret" "secret" {
  name_prefix             = var.secret_key
  recovery_window_in_days = 0
  tags                    = var.tags
}

resource "aws_secretsmanager_secret_version" "secret" {
  secret_id     = aws_secretsmanager_secret.secret.id
  secret_string = file(var.secret_json)
}
