terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# =========================================================================
# 1. NETWORKING LAYER (VPC, SUBNETS, AND ROUTING)
# =========================================================================
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project_name}-igw" }
}

# Public Subnets for the EC2 Web Engine
resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.project_name}-public-1" }
}

# Private Subnets for Database Isolation
resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "${var.aws_region}a"
  tags              = { Name = "${var.project_name}-private-1" }
}

resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "${var.aws_region}b"
  tags              = { Name = "${var.project_name}-private-2" }
}

# Routing rules for public internet accessibility
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "${var.project_name}-public-rt" }
}

resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_db_subnet_group" "rds" {
  name       = "${var.project_name}-rds-subnet-group"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]
  tags       = { Name = "${var.project_name}-db-subnet-group" }
}

# =========================================================================
# 2. SECURITY GROUPS (FIREWALL WALLS)
# =========================================================================
resource "aws_security_group" "ec2_sg" {
  name        = "${var.project_name}-ec2-sg"
  description = "Allows incoming HTTP/HTTPS and management SSH traffic"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Change to your office/home IP for locked-down access
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "rds_sg" {
  name        = "${var.project_name}-rds-sg"
  description = "Strictly isolates DB access to the backend compute group"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2_sg.id] # Strictly accepts connections ONLY from your EC2 server
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# =========================================================================
# 3. IDENTITY AND ACCESS MANAGEMENT (LEAST-PRIVILEGE INSTANCE PROFILE)
# =========================================================================
resource "aws_iam_role" "ec2_role" {
  name = "${var.project_name}-ec2-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_policy" "least_privilege_policy" {
  name        = "${var.project_name}-app-policy"
  description = "Granular programmatic rules for S3, SES, and Lambda execution tasks"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = "arn:aws:s3:::${var.project_name}-user-assets/*"
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["lambda:InvokeFunction"]
        Resource = "arn:aws:lambda:${var.aws_region}:*:function:saas-ai-task-enhancer2"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "attach_app_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.least_privilege_policy.arn
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.project_name}-ec2-instance-profile"
  role = aws_iam_role.ec2_role.name
}

# =========================================================================
# 4. STORAGE INFRASTRUCTURE (AMAZON S3 BUCKETS)
# =========================================================================

# Frontend Static Website Hosting Bucket
resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.project_name}-frontend-spa-site"
  force_destroy = true
}

resource "aws_s3_bucket_website_configuration" "frontend_site" {
  bucket = aws_s3_bucket.frontend.id
  index_document { suffix = "index.html" }
  error_document { key = "index.html" } # Necessary fallback for React SPA routing
}

# Private Attachments / Assets Bucket
resource "aws_s3_bucket" "assets" {
  bucket        = "${var.project_name}-user-assets"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "assets_block" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# =========================================================================
# 5. COMPUTE ENGINE AND DATA LAYER (EC2 & RDS POSTGRESQL)
# =========================================================================
resource "aws_instance" "backend" {
  ami                  = "ami-03f4878755434977f" # Standard Ubuntu 22.04 LTS AMI for ap-south-1
  instance_type        = "t3.micro"
  key_name             = "sprintflow-key"
  subnet_id            = aws_subnet.public_1.id
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  # AUTOMATED SERVER PREPARATION
  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install python3.11-venv python3-pip git nginx -y
              
              # Grant the default 'ubuntu' user permissions to the web directory
              mkdir -p /home/ubuntu/app
              chown -R ubuntu:ubuntu /home/ubuntu/app
              EOF

  tags = {
    Name = "${var.project_name}-backend-engine"
  }
}

resource "aws_db_instance" "postgres" {
  allocated_storage      = 20
  max_allocated_storage  = 100
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = "db.t3.micro"
  db_name                = var.project_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  skip_final_snapshot    = true
  publicly_accessible    = false

  tags = {
    Name = "${var.project_name}-database"
  }
}

# =========================================================================
# 6. COMMUNICATION AND SERVERLESS MICROSERVICES (SES & LAMBDA)
# =========================================================================
resource "aws_ses_email_identity" "email" {
  email = var.notification_email
}

resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Temporary placeholder deployment package for compiling the Lambda function shell structure
data "archive_file" "lambda_zip_placeholder" {
  type        = "zip"
  output_path = "${path.module}/lambda_placeholder.zip"
  source {
    content  = "def handler(event, context): return {'statusCode': 200}"
    filename = "lambda_function.py"
  }
}

resource "aws_lambda_function" "ai_enhancer" {
  filename         = data.archive_file.lambda_zip_placeholder.output_path
  function_name    = "saas-ai-task-enhancer2"
  role             = aws_iam_role.lambda_role.arn
  handler          = "lambda_function.handler"
  runtime          = "python3.11"
  timeout          = 15
  source_code_hash = data.archive_file.lambda_zip_placeholder.output_base64sha256
}