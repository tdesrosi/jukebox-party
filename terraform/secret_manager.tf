// Firebase API Key
resource "google_secret_manager_secret" "firebase_api_key" {
  secret_id = "REACT_APP_FIREBASE_API_KEY"
  replication {
    auto {}
  }

  depends_on = [google_project_service.enabled_apis]
}

// Experimentation shows it's the compute default SA responsible for Cloud Build steps
resource "google_secret_manager_secret_iam_member" "cb_secret_accessor" {
  project   = data.google_project.project.project_id
  secret_id = google_secret_manager_secret.firebase_api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"

  depends_on = [google_project_service.enabled_apis]
}

resource "google_secret_manager_secret" "stripe_secret" {
  secret_id = "STRIPE_SECRET_KEY"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "stripe_webhook" {
  secret_id = "STRIPE_WEBHOOK_SECRET"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "runner_stripe_access" {
  secret_id = google_secret_manager_secret.stripe_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.jukebox_runner.email}"
}

resource "google_secret_manager_secret_iam_member" "runner_webhook_access" {
  secret_id = google_secret_manager_secret.stripe_webhook.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.jukebox_runner.email}"
}
