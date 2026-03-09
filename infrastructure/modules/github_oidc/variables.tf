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

variable "github_organization" {
  type        = string
  description = "GitHub organization name (e.g. ATDawnTech)."
}

variable "github_repository" {
  type        = string
  description = "GitHub repository name (e.g. HubV2)."
}

variable "deployment_branch" {
  type        = string
  description = "Branch that is allowed to assume this role (e.g. main)."
  default     = "main"
}

variable "create_provider" {
  type        = bool
  description = "Whether to create the GitHub OIDC provider. Set to false if it already exists in this account."
  default     = false
}
