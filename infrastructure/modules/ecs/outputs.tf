output "alb_dns_name" {
  description = "The DNS name of the load balancer."
  value       = aws_lb.main.dns_name
}

output "ecs_cluster_name" {
  description = "The name of the ECS cluster."
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "The name of the ECS service."
  value       = aws_ecs_service.main.name
}

output "alb_security_group_id" {
  description = "Security group ID of the ALB — used to allow ingress to ECS tasks."
  value       = aws_security_group.alb.id
}

output "alb_zone_id" {
  description = "Hosted zone ID of the ALB — used to create Route53 ALIAS records."
  value       = aws_lb.main.zone_id
}
