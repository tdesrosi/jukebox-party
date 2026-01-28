output "service_url" {
  value = google_cloud_run_v2_service.jukebox_server.uri
  description = "The URL of the deployed Jukebox service"
}