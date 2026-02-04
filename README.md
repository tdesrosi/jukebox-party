# Classical Remix Jukebox

A real-time, cloud-native jukebox system designed for the
[Classical Remix Music Festival](https://classicalremixmusicfestival.org).
This platform synchronizes a curated repertoire across guest iPads, a stage
projector, and a director's mobile remote.

## Architecture

* **Frontend:** React (Framer Motion, Tailwind CSS, Lucide Icons)
* **Backend:** Go (Standard Library, Google Cloud SDK)
* **Database:** Google Cloud Firestore (Real-time synchronization)
* **Infrastructure:** Terraform & Google Cloud Platform (Cloud Run, Secret Manager)

---

## Component Details

### 1. Guest Picker (/picker)

* **Purpose:** Public-facing interface for song requests at [Classical Remix Music Festival](https://classicalremixmusicfestival.org) events.
* **Validation:** Client-side sanitation for obscenity, gibberish, and length.
* **Credits:** Real-time counter synced with global state to prevent over-requesting.

### 2. Director Admin (/admin)

* **Purpose:** Mobile-optimized remote for festival operations.
* **Security:** Protected by a login gateway and PrivateRoute wrapper.
* **Features:**
  * **Now Playing Hero:** High-visibility card for the current active song.
  * **Credit Management:** Incremental (+1/-1) control of the shared pool.
  * **Queue Management:** Ability to complete or permanently remove requests.
  * **History:** Last three completed songs with one-tap revert functionality.

### 3. Stage Projector (/projector)

* **Purpose:** Minimalist 4K output for the stage display.
* **Logic:** Automatically updates based on the oldest non-completed request in the queue.
* **Running:** From Chrome in MacOS, it is possible to use the following command in your terminal to display the page in kiosk mode:

  ```Bash
  /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --incognito --kiosk --user-data-dir=$(mktemp -d) http://localhost:3000/projector
  ```

---

## Deployment and Configuration

### 1. Infrastructure Provisioning

Run Terraform to create the Cloud Run services, Artifact Registry, and Secret Manager containers.

```hcl
terraform init
terraform apply
```

### 2. Secret Management

Upload the Firebase API Key to Secret Manager. This key is fetched during the build process to be injected into the React environment.

```Bash
echo -n "YOUR_API_KEY" | gcloud secrets versions add REACT_APP_FIREBASE_API_KEY --data-file=-
```

### 3. Build and Release

The Cloud Build pipeline handles the Node.js build (injecting secrets), the Go binary compilation, and the deployment to Cloud Run.

```Bash
gcloud builds submit --config cloudbuild.yaml .
```

## Data Synchronization (Seeder)

The Go seeder tool populates the library from a CSV file (data/repertoire.csv).

Mapping: Category, Artist, Song, AlbumArtURL.

Idempotency: Generates deterministic IDs from Artist and Title to prevent duplicates on repeated runs.

Execution: ```bash go run cmd/seeder/main.go```

---

## Local Development

1. **Environment Variables:** Create a `.env` file in the root directory.
2. **Dependencies:** * `npm install` in the frontend directory.
    * `go mod download` in the root.
3. **Execution:**
    * **Backend:** `go run cmd/server/main.go`
    * **Frontend:** `cd frontend && npm start`

---

For more information on the organization, visit [classicalremixmusicfestival.org](https://classicalremixmusicfestival.org).
