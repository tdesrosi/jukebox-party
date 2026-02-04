resource "google_firestore_database" "database" {
  name                    = "(default)"
  location_id             = var.region
  type                    = "FIRESTORE_NATIVE"
  delete_protection_state = "DELETE_PROTECTION_DISABLED" # Change to ENABLED for production
  depends_on              = [google_project_service.enabled_apis]
}

resource "google_firestore_document" "party_state" {
  project     = var.project_id
  database    = google_firestore_database.database.name
  collection  = "party"
  document_id = "current_state"
  
  # Firestore documents in Terraform use a JSON-encoded string for fields
  fields = jsonencode({
    credits = {
      integerValue = "0"
    }
    isActive = {
      booleanValue = true
    }
  })

  depends_on = [google_firestore_database.database]
}

resource "google_firestore_index" "queue_prev_index" {
  collection = "queue"

  fields {
    field_path = "isCompleted"
    order      = "ASCENDING"
  }

  fields {
    field_path = "timestamp"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.database]
}