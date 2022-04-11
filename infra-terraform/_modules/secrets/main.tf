# resource "aws_secretsmanager_secret" "secret" {
#   for_each = {
#     for index, secret in var.file_secrets :
#     index => secret
#   }

#   name                    = each.value.key
#   recovery_window_in_days = 0
#   tags                    = var.tags
# }

# resource "aws_secretsmanager_secret_version" "secret" {
#   for_each = {
#     for index, secret in var.file_secrets :
#     index => secret
#   }

#   secret_id     = aws_secretsmanager_secret.secret[each.key].id
#   secret_string = file(each.value.path)
# }
