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

resource "google_cloud_run_v2_service" "jukebox_server" {
  name     = "jukebox-service"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.jukebox_runner.email

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/jukebox-repo/jukebox-server:latest"

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      # Inject Admin Password (/admin)
      env {
        name  = "ADMIN_PASSWORD"
        value = "Remix1234!"
      }

      # Inject Kiosk Key (saved in local browser storage to unlock kiosk features))
      env {
        name  = "KIOSK_MASTER_KEY"
        value = "classical-remix-kiosk"
      }

      env {
        name = "STRIPE_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.stripe_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "STRIPE_WEBHOOK_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.stripe_webhook.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }

  depends_on = [
    google_project_service.enabled_apis,
    google_secret_manager_secret_iam_member.runner_stripe_access
  ]
}

# Allow Public Access
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  location = google_cloud_run_v2_service.jukebox_server.location
  name     = google_cloud_run_v2_service.jukebox_server.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
