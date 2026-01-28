variable "project_id" {
  type = string
  description = "GCP Project ID"
}

variable "region" {
    type = string
    description = "GCP Region (us-central1)"
    default = "us-central1"
}