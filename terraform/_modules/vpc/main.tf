################################################################################
# VPC
################################################################################

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr

  tags = {
    "Name" = "${var.vpc_name}-${var.environment}"
  }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.vpc_name} Internet gateway"
  }
}

################################################################################
# Subnets
################################################################################

resource "aws_subnet" "public" {
  count                   = length(var.public_subnets)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = element(var.public_subnets, count.index)
  availability_zone       = element(var.azs, count.index)
  map_public_ip_on_launch = true

  tags = merge(
    { Name = "${var.vpc_name}-public-${element(var.azs, count.index)}" },
    var.public_subnet_tags
  )
}

resource "aws_subnet" "private" {
  count             = length(var.private_subnets)
  vpc_id            = aws_vpc.main.id
  cidr_block        = element(var.private_subnets, count.index)
  availability_zone = element(var.azs, count.index + length(aws_subnet.public))

  tags = merge(
    { Name = "${var.vpc_name}-private-${element(var.azs, count.index)}" },
    var.private_subnet_tags
  )
}

################################################################################
# NAT Gateway
################################################################################

resource "aws_eip" "nat" {
  vpc = true

  tags = {
    Name = "${var.vpc_name} NAT IP"
  }
}

resource "aws_nat_gateway" "nat_gw" {
  allocation_id = aws_eip.nat.id
  subnet_id     = element(aws_subnet.private, 0).id

  tags = {
    Name = "${var.vpc_name} NAT"
  }

  # To ensure proper ordering, it is recommended to add an explicit dependency
  # on the Internet Gateway for the VPC.
  depends_on = [aws_internet_gateway.gw]
}

################################################################################
# Peering Connection
################################################################################

resource "aws_default_vpc" "default" {}

resource "aws_vpc_peering_connection" "connection" {
  vpc_id      = aws_vpc.main.id
  peer_vpc_id = aws_default_vpc.default.id
  auto_accept = true

  tags = {
    Name = "${var.vpc_name} Peering Connection"
  }
}

# Default VPC peering configuration
data "aws_route_table" "default" {
  filter {
    name   = "vpc-id"
    values = [aws_default_vpc.default.id]
  }

  filter {
    name   = "association.main"
    values = [true]
  }
}

resource "aws_route" "default" {
  route_table_id            = data.aws_route_table.default.id
  destination_cidr_block    = aws_vpc.main.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.connection.id
}

################################################################################
# Route Tables
################################################################################

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  route {
    cidr_block                = aws_default_vpc.default.cidr_block
    vpc_peering_connection_id = aws_vpc_peering_connection.connection.id
  }

  tags = {
    Name = "${var.vpc_name} Public Route Table"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat_gw.id
  }

  route {
    cidr_block                = aws_default_vpc.default.cidr_block
    vpc_peering_connection_id = aws_vpc_peering_connection.connection.id
  }

  tags = {
    Name = "${var.vpc_name} Private Route Table"
  }
}

################################################################################
# Route Table Associations
################################################################################

resource "aws_route_table_association" "public_association" {
  count          = length(aws_subnet.public)
  subnet_id      = element(aws_subnet.public, count.index).id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_association" {
  count          = length(aws_subnet.private)
  subnet_id      = element(aws_subnet.private, count.index).id
  route_table_id = aws_route_table.private.id
}
