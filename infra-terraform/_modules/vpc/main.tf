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
# Peering Connection
################################################################################

data "aws_vpc" "default" {
  default = true
}

resource "aws_vpc_peering_connection" "foo" {
  peer_vpc_id = aws_vpc.main.id
  vpc_id      = data.aws_vpc.default.id
  auto_accept = true
  tags = {
    Name = "${var.vpc_name} Peering Connection"
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
# Route Tables
################################################################################

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
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
