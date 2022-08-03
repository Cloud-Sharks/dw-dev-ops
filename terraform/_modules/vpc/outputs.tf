output "vpc_id" {
  value       = aws_vpc.main.id
  description = "ID of the VPC"
}

output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "Public Subnet IDS"
}

output "private_subnet_ids" {
  value       = aws_subnet.private[*].id
  description = "Public Subnet IDS"
}
