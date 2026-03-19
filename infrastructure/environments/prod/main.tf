terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.37"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "s3" {
    bucket         = "shared-prod-s3-terraform-state"
    key            = "hub/prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "shared-prod-dynamodb-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      product     = var.product
      environment = var.environment
      owner       = "at-dawn"
      managed-by  = "terraform"
      cost-center = "engineering"
    }
  }
}

# 1. DNS — ACM certificate for hub.atdawntech.com and api.hub.atdawntech.com
module "dns" {
  source = "../../modules/dns"

  domain_name = var.domain_name
}

# 2. Networking — read from at-dawn-infra VPC via SSM (internal-prod account: 380958218583)
# Subnets: /internal/prod/vpc/hubv2-private-subnet-ids
data "aws_ssm_parameter" "vpc_id" {
  name = "/internal/${var.environment}/vpc/id"
}

data "aws_ssm_parameter" "public_subnet_ids" {
  name = "/internal/${var.environment}/vpc/public-subnet-ids"
}

data "aws_ssm_parameter" "private_subnet_ids" {
  name = "/internal/${var.environment}/vpc/hubv2-private-subnet-ids"
}

locals {
  vpc_id             = data.aws_ssm_parameter.vpc_id.value
  public_subnet_ids  = split(",", data.aws_ssm_parameter.public_subnet_ids.value)
  private_subnet_ids = split(",", data.aws_ssm_parameter.private_subnet_ids.value)
}

# 3. ECR Repository
module "api_ecr" {
  source = "../../modules/ecr"

  product      = var.product
  environment  = var.environment
  service_name = "api"
}

# 4. Security Groups
resource "aws_security_group" "ecs_api" {
  name        = "${var.product}-${var.environment}-ecs-api-sg"
  description = "Security group for ECS API tasks - allows inbound only from the ALB."
  vpc_id      = local.vpc_id

  ingress {
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [module.api_ecs.alb_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.product}-${var.environment}-ecs-api-sg"
  }
}

# 5. Database — shared RDS managed by at-dawn-shared-db (internal-prod account: 380958218583).
# Prerequisite: at-dawn-shared-db must have created the hubv2 database/user and published:
#   /internal/prod/rds/hubv2/database-url (SecureString)

# 6. ECS Cluster & Service (with HTTPS ALB)
module "api_ecs" {
  source = "../../modules/ecs"

  product            = var.product
  environment        = var.environment
  aws_region         = var.aws_region
  service_name       = "api"
  ecr_repository_url = module.api_ecr.repository_url

  vpc_id                = local.vpc_id
  private_subnets       = local.private_subnet_ids
  public_subnets        = local.public_subnet_ids
  ecs_security_group_id = aws_security_group.ecs_api.id

  cpu                 = var.ecs_task_cpu
  memory              = var.ecs_task_memory
  allowed_origins     = "https://${var.domain_name}"
  acm_certificate_arn = module.dns.certificate_arn
  frontend_url        = "https://${var.domain_name}"
  api_url             = "https://api.${var.domain_name}"

  database_url_ssm_path = "/internal/${var.environment}/rds/hubv2/database-url"
}

# 7. Frontend (S3 + CloudFront)
module "frontend" {
  source = "../../modules/frontend"

  product             = var.product
  environment         = var.environment
  domain_name         = var.domain_name
  acm_certificate_arn = module.dns.certificate_arn
}

# 8. GitHub Actions OIDC
module "github_oidc" {
  source = "../../modules/github_oidc"

  product             = var.product
  environment         = var.environment
  aws_region          = var.aws_region
  github_organization = var.github_organization
  github_repository   = var.github_repository
  deployment_branch   = "main"
  create_provider     = true # OIDC provider does not yet exist in 380958218583
}

# 9. SAML SSM parameter placeholders
resource "aws_ssm_parameter" "saml_sso_url" {
  name  = "/${var.product}/${var.environment}/api/saml-idp-sso-url"
  type  = "SecureString"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "saml_cert" {
  name  = "/${var.product}/${var.environment}/api/saml-idp-cert"
  type  = "SecureString"
  value = "PLACEHOLDER"

  lifecycle {
    ignore_changes = [value]
  }
}

# 10. JWT secret
resource "random_password" "api_jwt" {
  length = 64
}

resource "aws_ssm_parameter" "api_jwt_secret" {
  name  = "/${var.product}/${var.environment}/api/jwt-secret"
  type  = "SecureString"
  value = random_password.api_jwt.result
}
