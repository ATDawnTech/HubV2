variable "product" {
  type        = string
  description = "Product name (adthub)."
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev | test | prod)."
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

variable "ecs_task_cpu" {
  type        = number
  description = "CPU units for the API ECS task."
  default     = 256
}

variable "ecs_task_memory" {
  type        = number
  description = "Memory in MB for the API ECS task."
  default     = 512
}

variable "domain_name" {
  type        = string
  description = "Frontend subdomain for this environment (e.g. adthub-dev.atdawntech.com)."
}
