# Issue an ACM certificate covering both the frontend subdomain and the API subdomain.
# DNS validation records are output so they can be added manually to Cloudflare.
# Terraform does NOT wait for validation here — see the environment outputs for the
# CNAME records to add to Cloudflare. Once Cloudflare has the records, AWS validates
# the cert automatically (typically 2–5 minutes).
resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["api.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}
