resource "google_artifact_registry_repository" "jukebox_repo" {
  location      = var.region
  repository_id = "jukebox-repo"
  description   = "Docker repository for Jukebox Cloud Run images"
  format        = "DOCKER"
  depends_on    = [google_project_service.enabled_apis]
}