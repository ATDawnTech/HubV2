product     = "hub"
environment = "prod"
aws_region  = "us-east-1"

# GitHub OIDC
github_organization = "ATDawnTech"
github_repository   = "HubV2"

# Compute — prod gets more resources
ecs_task_cpu    = 512
ecs_task_memory = 1024

# DNS
domain_name = "hub.atdawntech.com"
