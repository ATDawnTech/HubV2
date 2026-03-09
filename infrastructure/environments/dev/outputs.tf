output "ecr_repository_url" {
  value       = module.api_ecr.repository_url
  description = "ECR repository URL for pushing the backend Docker image."
}

output "ecs_cluster_name" {
  description = "The name of the ECS cluster."
  value       = module.api_ecs.ecs_cluster_name
}

output "ecs_service_name" {
  description = "The name of the ECS service."
  value       = module.api_ecs.ecs_service_name
}

output "alb_dns_name" {
  description = "ALB DNS name — add an A/CNAME record in Cloudflare for api.adthub-dev.atdawntech.com pointing here."
  value       = module.api_ecs.alb_dns_name
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name — add a CNAME in Cloudflare for adthub-dev.atdawntech.com pointing here."
  value       = module.frontend.cloudfront_domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID — used for cache invalidation in deploy-dev.yml."
  value       = module.frontend.cloudfront_distribution_id
}

output "github_actions_role_arn" {
  value       = module.github_oidc.role_arn
  description = "IAM Role ARN for GitHub Actions. Add to GitHub Secrets as AWS_DEV_DEPLOY_ROLE."
}

output "acm_validation_records" {
  value       = module.dns.validation_records
  description = "CNAME records to add to Cloudflare to validate the ACM certificate."
}

output "frontend_url" {
  value       = "https://${var.domain_name}"
  description = "Frontend URL."
}

output "api_url" {
  value       = "https://api.${var.domain_name}"
  description = "API URL."
}
