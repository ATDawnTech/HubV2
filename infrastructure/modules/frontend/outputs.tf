output "cloudfront_domain_name" {
  description = "The CloudFront distribution domain name — point the Cloudflare CNAME here."
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_id" {
  description = "The CloudFront distribution ID — used for cache invalidation in CI/CD."
  value       = aws_cloudfront_distribution.main.id
}

output "s3_bucket_name" {
  description = "The S3 bucket name for the frontend assets."
  value       = aws_s3_bucket.main.bucket
}
