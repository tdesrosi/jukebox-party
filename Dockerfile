# --- BUILD STAGE ---
FROM golang:1.25-alpine AS builder
WORKDIR /app

# Install git/certs for Go modules
RUN apk add --no-cache git ca-certificates

# Copy go.mod first to leverage Docker cache
COPY go.mod go.sum ./
RUN go mod download

# Copy everything (internal, cmd, etc.)
COPY . .

# Build the binary - pointing specifically to the server main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o jukebox-app ./cmd/server/main.go

# --- FINAL STAGE ---
FROM alpine:latest
WORKDIR /root/

# Bring in the compiled Go binary
COPY --from=builder /app/jukebox-app .

# Bring in the React build from the frontend folder
# Note: Cloud Build runs 'npm run build' BEFORE this step
COPY ./frontend/build ./frontend/build

EXPOSE 8080

# Run the app
CMD ["./jukebox-app"]