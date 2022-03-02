output "security_group_ids" {
  description = "List of security group ids"
  value = [
    aws_security_group.allow_http.id,
    aws_security_group.allow_ssh.id,
    aws_security_group.allow_ping.id
  ]
}
