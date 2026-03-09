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

variable "domain_name" {
  type        = string
  description = "Custom domain for the CloudFront distribution (e.g. adthub-dev.atdawntech.com)."
}

variable "acm_certificate_arn" {
  type        = string
  description = "ARN of the ACM certificate covering the domain_name."
}
