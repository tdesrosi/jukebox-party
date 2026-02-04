resource "google_secret_manager_secret" "firebase_api_key" {
  secret_id = "REACT_APP_FIREBASE_API_KEY"
  replication {
    auto {}
  }

  depends_on = [ google_project_service.enabled_apis ]
}

// Experimentation shows it's the compute default SA responsible for Cloud Build steps
resource "google_secret_manager_secret_iam_member" "cb_secret_accessor" {
  project   = data.google_project.project.project_id
  secret_id = google_secret_manager_secret.firebase_api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"

  depends_on = [ google_project_service.enabled_apis ]
}
