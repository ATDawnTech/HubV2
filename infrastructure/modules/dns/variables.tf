variable "domain_name" {
  type        = string
  description = "The frontend subdomain to issue a certificate for (e.g. adthub-test.atdawntech.com). The API subdomain (api.{domain_name}) is added automatically as a SAN."
}
