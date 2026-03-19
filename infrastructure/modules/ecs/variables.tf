variable "product" {
  type        = string
  description = "Product name (e.g. adthub)."
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev | test | prod)."

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "Environment must be dev, test, or prod."
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region."
  default     = "us-east-1"
}

variable "service_name" {
  type        = string
  description = "Name of the ECS service being deployed."
}

variable "ecr_repository_url" {
  type        = string
  description = "The ECR repository URL pointing to the image to run."
}

variable "cpu" {
  type        = number
  description = "CPU units for the ECS task (256, 512, 1024, 2048, 4096)."
  default     = 256
}

variable "memory" {
  type        = number
  description = "Memory in MB for the ECS task."
  default     = 512
}

variable "desired_count" {
  type        = number
  description = "Number of ECS tasks to run."
  default     = 1
}

variable "allowed_origins" {
  type        = string
  description = "Comma-separated valid CORS origins."
}

variable "private_subnets" {
  type        = list(string)
  description = "List of private subnet IDs for the ECS tasks."
}

variable "public_subnets" {
  type        = list(string)
  description = "List of public subnet IDs for the ALB."
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where the ECS cluster and ALB will be created."
}

variable "ecs_security_group_id" {
  type        = string
  description = "Security group ID for the ECS tasks."
}

variable "acm_certificate_arn" {
  type        = string
  description = "ARN of the ACM certificate to attach to the HTTPS listener on the ALB."
}

variable "frontend_url" {
  type        = string
  description = "Public URL of the frontend (e.g. https://adthub-test.atdawntech.com)."
}

variable "api_url" {
  type        = string
  description = "Public URL of the API (e.g. https://api.adthub-test.atdawntech.com)."
}

variable "database_url_ssm_path" {
  type        = string
  description = "SSM path for the DATABASE_URL secret. Defaults to /<product>/<env>/<service>/database-url."
  default     = ""
}

variable "azure_tenant_id" {
  type        = string
  description = "Microsoft Entra tenant ID."
  default     = ""
}

variable "azure_client_id" {
  type        = string
  description = "Microsoft Entra app client ID."
  default     = ""
}
