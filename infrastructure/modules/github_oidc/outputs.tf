output "role_arn" {
  description = "ARN of the GitHub Actions IAM role. Add to GitHub Secrets as AWS_{ENV}_DEPLOY_ROLE."
  value       = aws_iam_role.github_actions.arn
}
