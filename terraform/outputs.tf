output "ec2_public_ip" {
  description = "The public facing IPv4 endpoint address of your application instance host."
  value       = aws_instance.backend.public_ip
}

output "rds_endpoint" {
  description = "The database network connection endpoint string required by SQLAlchemy strings."
  value       = aws_db_instance.postgres.endpoint
}

output "frontend_s3_website_endpoint" {
  description = "The public target URL for viewing the static web layout bundle."
  value       = aws_s3_bucket_website_configuration.frontend_site.website_endpoint
}

output "assets_s3_bucket_name" {
  description = "The target identifier to supply inside environment strings for uploads routing configuration."
  value       = aws_s3_bucket.assets.id
}