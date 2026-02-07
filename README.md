# Classical Remix Jukebox

A real-time, cloud-native jukebox system designed for the [Classical Remix Music Festival](https://classicalremixmusicfestival.org). This platform synchronizes a curated repertoire across guest iPads, a stage projector, and a director's mobile remote.

## Architecture

* **Frontend:** React (Framer Motion, Tailwind CSS)
* **Backend:** Go (Gin Framework, Stripe SDK)
* **Database:** Google Cloud Firestore (Real-time synchronization)
* **Infrastructure:** Terraform & Google Cloud Platform (Cloud Run, Secret Manager)

## Operations Manual: Running a Show

### 1. Setting up a Kiosk (iPad)

The Kiosk mode allows guests to request songs using physical tickets/credits instead of credit cards.

1. **Navigate:** Open Safari on the iPad and go to `https://<YOUR_DOMAIN>/login`.
2. **Authenticate:** Log in using the **Admin Password**.
3. **Activate:** On the Director's Dashboard, tap the **`Launch Kiosk`** button.
4. **Handshake:** The system silently saves a `Kiosk Key` to the browser's local storage and redirects to the Picker.
5. **Result:** The iPad is now in Kiosk Mode (Ticket icon visible). This means song selection does not redirect to the Stripe payment platform, as we'll collect tickets from guests physically in this mode.

### 2. The Stage Projector (Laptop)

1. Connect laptop to the venue screen (1080p/4K).
2. Launch Chrome in Kiosk Mode pointing to `https://<YOUR_DOMAIN>/projector`.

    ```bash
    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --incognito --kiosk --user-data-dir=$(mktemp -d) https://<YOUR_DOMAIN>/projector
    ```

### 3. Director's Remote

1. Log in at `https://<YOUR_DOMAIN>/login`.
2. Use the dashboard to manage the queue, refill credits, and skip songs.

## Engineering Manual

### 1. Prerequisites

* **Google Cloud Platform:** A project with Billing enabled (Cloud Run, Firestore, Secret Manager, Artifact Registry).
* **Stripe Account:** Active account with Developer access.
* **Terraform:** Installed locally for infrastructure provisioning.

### 2. Secrets and Configuration

#### Build-time Secrets

This application uses two distinct methods for handling secrets based on where the code executes.

**Why?** React runs in the user's browser, not on our server. It cannot `ask` Google Secret Manager for keys at runtime.

**How?** We inject these keys during the `npm run build` process in **Cloud Build**. The key is baked into the JavaScript bundle.

* **`REACT_APP_FIREBASE_API_KEY`**: Publicly visible key required for the browser to connect to Firestore.

```yaml
# cloudbuild.yaml snippet
availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_NUMBER/secrets/REACT_APP_FIREBASE_API_KEY/versions/latest
      env: 'REACT_APP_FIREBASE_API_KEY'
```

#### Runtime Secrets

**Why?** The Go server runs in a secure container. It fetches secrets only when the service starts, keeping them off the file system and out of the build logs.
**How?** Terraform maps Secret Manager versions or Environment Variables directly to the container's environment.

* **`ADMIN_PASSWORD`**: The password humans type to access the `/admin` route.
* **`KIOSK_MASTER_KEY`**: The internal token returned by the API after a successful login. The frontend saves this to Local Storage to unlock Kiosk features.
* **`STRIPE_SECRET_KEY`**: Used to generate payment sessions.
* **`STRIPE_WEBHOOK_SECRET`**: Used to verify payment confirmation events.

### 3. Stripe Configuration

**Get API Keys:**

1. Go to **Stripe Dashboard > Developers > API keys**.
2. Copy the **Secret Key** (`sk_test_...` or `sk_live_...`).

**Setup Webhook:**

1. Go to **Developers > Webhooks**.
2. Add Endpoint: `https://<YOUR_CLOUD_RUN_URL>/api/webhooks/stripe`
3. Events: Select `checkout.session.completed`.
4. Copy the **Signing Secret** (`whsec_...`).

### 4. Infrastructure (Terraform)

Initialize and apply the Terraform configuration to create the Cloud Run service, IAM policies, and Secret Manager placeholders.

The `main.tf` configuration demonstrates how runtime secrets are injected. Note that Stripe keys are pulled strictly from Secret Manager, while configuration values are passed as standard Environment Variables.

#### Initialize Terraform

```bash
terraform init
```

#### Apply Infrastructure

```bash
terraform apply
```

### 5. Uploading Secrets

We use Google Secret Manager to securely inject credentials at runtime. Do not commit these to Git.

#### React Environment (Build-Time)

Used by Cloud Build to bake the API key into the React app.

```bash
echo -n `YOUR_FIREBASE_API_KEY` | gcloud secrets versions add REACT_APP_FIREBASE_API_KEY --data-file=-
```

#### Stripe Keys (Runtime)

Injected into the Go server process.

```bash
# Stripe Secret Key (sk_...)
echo -n `sk_test_...` | gcloud secrets versions add STRIPE_SECRET_KEY --data-file=-

# Stripe Webhook Secret (whsec_...)
echo -n `whsec_...` | gcloud secrets versions add STRIPE_WEBHOOK_SECRET --data-file=-
```

### 6. Build and Deploy

The `cloudbuild.yaml` pipeline handles:

1. Fetching the Firebase Key from Secret Manager.
2. Building the React Frontend (`npm run build`).
3. Compiling the Go Backend.
4. Deploying the container to Cloud Run.

```bash
gcloud builds submit --config cloudbuild.yaml .
```

### Data Synchronization (Seeder)

To reset or populate the song library, use the Go seeder tool. It reads from `data/repertoire.csv`.

* **Mapping:** `Category, Artist, Song, AlbumArtURL`
* **Execution:**

```bash
go run ./cmd/seeder/main.go
```

### Local Development

For testing without deploying to Cloud Run:

#### 1. Environment

Create a `.env` file in the root.

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
DOMAIN_NAME=<http://localhost:3000>
GOOGLE_CLOUD_PROJECT=your-project-id

# Admin Auth
ADMIN_PASSWORD=local-admin-pass
KIOSK_MASTER_KEY=classical-remix-ipad

# Frontend
REACT_APP_FIREBASE_API_KEY=AIzaSy...
```

#### 2. Start Stripe Tunnel

```bash
stripe listen --forward-to localhost:8080/api/webhooks/stripe
```

#### 3. Run Backend

```bash
go run ./cmd/server/
```

#### 4. Run Frontend

```bash
cd frontend && npm start
```
