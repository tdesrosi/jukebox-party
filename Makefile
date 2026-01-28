# Build and Run Variables
PROJECT_ID=jukebox-party-f0942
SERVER_BINARY=jukebox-server

.PHONY: seed server build-frontend deploy-infra

# Run the seeder script
seed:
	GOOGLE_CLOUD_PROJECT=jukebox-party-485415 go run ./cmd/seeder

# Run the server locally
server:
	go run ./cmd/server

# Build the React frontend
build-frontend:
	cd frontend && npm run build

# Apply Terraform changes
deploy-infra:
	cd terraform && terraform apply -var="project_id=$(PROJECT_ID)"

# Build Docker image and push to GCP (Simplified)
deploy-server: build-frontend
	docker build -t gcr.io/$(PROJECT_ID)/$(SERVER_BINARY) -f cmd/server/Dockerfile .
	docker push gcr.io/$(PROJECT_ID)/$(SERVER_BINARY)
	gcloud run deploy jukebox-service --image gcr.io/$(PROJECT_ID)/$(SERVER_BINARY) --region us-central1