# Classical Remix Jukebox

A real-time, cloud-native jukebox system designed for the [Classical Remix Music Festival](https://classicalremixmusicfestival.org). This platform synchronizes a curated repertoire across guest iPads, a stage projector, and a director's mobile remote, offering both free (ticket-based) and paid (Stripe-integrated) request methods.

## Architecture

* **Frontend:** React (Framer Motion, Tailwind CSS, Lucide Icons)
* **Backend:** Go (Gin Framework, Stripe SDK, Google Cloud SDK)
* **Database:** Google Cloud Firestore (Real-time synchronization)
* **Infrastructure:** Terraform & Google Cloud Platform (Cloud Run, Secret Manager)

---

## 🎭 Operations Manual: Running a Show

This section details how to set up the hardware stations at the venue.

### 1. The Guest Kiosk (iPad)

* **Hardware:** iPad on a music stand.
* **Setup:**
    1. Open Safari and navigate to `https://<YOUR_DOMAIN>/kiosk`.
    2. Enter the **Kiosk Master Key** (defined in `src/config.js`).
    3. Click **Authorize Device**.
    4. The app will redirect to the Picker in **Kiosk Mode** (showing the Ticket icon).
* **Function:** Guests use physical tickets/credits to request songs without payment.

### 2. The Stage Projector (Laptop)

* **Hardware:** Laptop connected to the venue projector/screen via HDMI.
* **Setup:**
    1. Connect to the display and set resolution to 1080p or 4K.
    2. Launch the projector view in **Kiosk Mode** to hide browser chrome.

    **MacOS Chrome Command:**

    ```bash
    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --incognito --kiosk --user-data-dir=$(mktemp -d) https://<YOUR_DOMAIN>/projector
    ```

* **Function:** Displays the "Now Playing" song and the next item in the queue.

### 3. The Director's Remote (Phone)

* **Hardware:** Artistic Director's smartphone.
* **Setup:**
    1. Go to `https://<YOUR_DOMAIN>/login`.
    2. Enter the **Admin Password**.
    3. You will be redirected to the Dashboard.
* **Function:**
  * **Advance Queue:** Swipe or tap to mark songs as "Complete."
  * **Replay Queue:** Revert to a previous song in case it was completed early.
  * **Refill Credits:** Add or remove credits to the shared kiosk pool.
  * **Emergency Revert:** Undo the last action if a song was skipped by mistake.

---

## 🛠️ Engineering Manual: Technical Setup

### 1. Prerequisites

* **Google Cloud Platform:** A project with Billing enabled (Cloud Run, Firestore, Secret Manager, Artifact Registry).
* **Stripe Account:** Active account with Developer access.
* **Terraform:** Installed locally for infrastructure provisioning.

### 2. Application Configuration (`src/config.js`)

Ensure `src/config.js` exists in the frontend source. This file manages the hardcoded access keys for the frontend UI components.

```javascript
export const KIOSK_SECRET = "your-kiosk-passcode";
export const ADMIN_PASSWORD = "your-admin-passcode";
```

### 3. Stripe Configuration

Get API Keys:

1. Go to Stripe Dashboard > Developers > API keys.
2. Copy the Secret Key (sk_test_... or sk_live_...).

Setup Webhook:

1. Go to Developers > Webhooks.
2. Add Endpoint: https://<YOUR_CLOUD_RUN_URL>/api/webhooks/stripe
3. Events: Select checkout.session.completed.
4. Copy the Signing Secret (whsec_...).

### 4. Infrastructure (Terraform)

Initialize and apply the Terraform configuration to create the Cloud Run service, IAM policies, and Secret Manager placeholders.

#### Initialize Terraform

```Bash
terraform init
```

#### Apply Infrastructure

```Bash
terraform apply
```

### 5. Uploading Secrets

We use Google Secret Manager to securely inject credentials at runtime. Do not commit these to Git.

#### React Environment (Build-Time)

Used by Cloud Build to bake the API key into the React app.

```Bash
echo -n "YOUR_FIREBASE_API_KEY" | gcloud secrets versions add REACT_APP_FIREBASE_API_KEY --data-file=-
```

#### Stripe Keys (Runtime)

Injected into the Go server process.

```Bash
# Stripe Secret Key (sk_...)
echo -n "sk_test_..." | gcloud secrets versions add STRIPE_SECRET_KEY --data-file=-

# Stripe Webhook Secret (whsec_...)
echo -n "whsec_..." | gcloud secrets versions add STRIPE_WEBHOOK_SECRET --data-file=-
```

### 6. Build and Deploy

The cloudbuild.yaml pipeline handles:

* Fetching the Firebase Key from Secret Manager.
* Building the React Frontend (npm run build).
* Compiling the Go Backend.
* Deploying the container to Cloud Run.

```Bash
gcloud builds submit --config cloudbuild.yaml .
```

### Data Synchronization (Seeder)

To reset or populate the song library, use the Go seeder tool. It reads from `data/repertoire.csv`.

Mapping: `Category, Artist, Song, AlbumArtURL`

Execution:

```Bash
go run cmd/seeder/main.go
```

### Local Development

For testing without deploying to Cloud Run:

#### 1. Environment

Create a .env file in the root.

```Bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
DOMAIN_NAME=http://localhost:3000
GOOGLE_CLOUD_PROJECT=your-project-id
KIOSK_MASTER_KEY=classical-remix-ipad
```

#### 2. Start Stripe Tunnel

```Bash
stripe listen --forward-to localhost:8080/api/webhooks/stripe
```

#### 3. Run Backend

`go run main.go handlers.go`

#### 4. Run Frontend

`cd frontend && npm start`
