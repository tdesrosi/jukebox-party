# --- BUILD STAGE ---
FROM golang:1.25-alpine AS builder 
WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o jukebox-app ./cmd/server/

# --- FINAL STAGE ---
FROM alpine:latest
WORKDIR /root/

# Install certs in final stage so Go can talk to Firestore over HTTPS
RUN apk add --no-cache ca-certificates

COPY --from=builder /app/jukebox-app .

# The build happens in Cloud Build, so we copy the local directory
COPY ./frontend/build ./frontend/build

EXPOSE 8080

CMD ["./jukebox-app"]