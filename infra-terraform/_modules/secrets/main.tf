resource "aws_secretsmanager_secret" "secret" {
  for_each = toset(var.secrets)
  name     = "${each.key}-${var.environment}"
  tags     = var.tags
}
