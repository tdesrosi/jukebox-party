# Custom SA for App
resource "google_service_account" "jukebox_runner" {
  account_id   = "jukebox-runner"
  display_name = "Jukebox App Runner"
}

resource "google_project_iam_member" "firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.jukebox_runner.email}"
}

# Cloud Run Service
resource "google_cloud_run_v2_service" "jukebox_server" {
  name     = "jukebox-service"
  location = var.region

  template {
    service_account = google_service_account.jukebox_runner.email
    containers {
      # We'll point this to our Artifact Registry once the image is pushed
      image = "${var.region}-docker.pkg.dev/${var.project_id}/jukebox-repo/jukebox-server:latest"
      
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image, # Allow gcloud/CI to update image without TF reverting it
    ]
  }

  depends_on = [google_project_service.enabled_apis]
}

# Allow Unauthenticated Access (Public)
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  location = google_cloud_run_v2_service.jukebox_server.location
  name     = google_cloud_run_v2_service.jukebox_server.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}