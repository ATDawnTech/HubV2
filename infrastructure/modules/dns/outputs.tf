output "certificate_arn" {
  value       = aws_acm_certificate.main.arn
  description = "ARN of the ACM certificate. Available immediately after cert creation — validation happens asynchronously via Cloudflare DNS."
}

output "validation_records" {
  value = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
  description = "CNAME records to add to Cloudflare to validate the ACM certificate. Add all entries — one per domain covered by the cert."
}
