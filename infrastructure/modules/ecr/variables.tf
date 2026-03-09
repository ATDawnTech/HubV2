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

variable "service_name" {
  type        = string
  description = "Service name used in the repository name (e.g. api)."
}
