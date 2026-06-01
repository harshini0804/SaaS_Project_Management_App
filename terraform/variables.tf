variable "aws_region" {
  description = "The AWS region to deploy all resources into"
  type        = string
  default     = "ap-south-1" # Mumbai region as per latency optimization requirements
}

variable "project_name" {
  description = "The prefix added to resource names for organizational grouping"
  type        = string
  default     = "sprintflow"
}

variable "db_username" {
  description = "The master username for the Amazon RDS PostgreSQL instance"
  type        = string
  default     = "sprintflow_admin"
}

variable "db_password" {
  description = "The master password for the database. Must be at least 8 characters long."
  type        = string
  sensitive   = true
}

variable "notification_email" {
  description = "The verified email address used for Amazon SES transactional messaging"
  type        = string
  default     = "noreply@sprintflow.app"
}