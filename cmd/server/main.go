package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/stripe/stripe-go/v84"
)

var client *firestore.Client

func main() {
	// 1. Environment Loading
	if os.Getenv("K_SERVICE") == "" {
		err := godotenv.Load()
		if err != nil {
			log.Println("Note: .env file not found, using system environment variables")
		}
	}

	// 2. Initialize Stripe
	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
	if stripe.Key == "" {
		log.Fatal("CRITICAL: STRIPE_SECRET_KEY is missing. Check .env or Secret Manager.")
	}

	ctx := context.Background()
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		projectID = "jukebox-party-485415"
	}

	// 3. Initialize Firestore
	var err error
	client, err = firestore.NewClient(ctx, projectID)
	if err != nil {
		log.Fatalf("Failed to create Firestore client: %v", err)
	}
	defer client.Close()

	r := gin.Default()

	// Serve static branding assets
	r.StaticFile("/classical-remix.jpeg", "./frontend/public/classical-remix.jpeg")

	// --- API ROUTES ---
	api := r.Group("/api")
	{
		// 1. Library & Kiosk Handlers
		api.GET("/library", handleLibrary)
		api.POST("/request", handleRequest)

		api.POST("/emergency-request", handleEmergencyRequest)

		// 2. Individual Mobile Pay Endpoints
		api.POST("/create-checkout-session", handleCreateCheckoutSession)
		api.POST("/webhooks/stripe", handleStripeWebhook)

		// 3. Auth
		api.POST("/auth/verify", handleVerify)

		// 4. Protected Admin Endpoints
		admin := api.Group("/admin")
		admin.Use(AdminAuthMiddleware())
		{
			admin.POST("/next", handleNextSong)
			admin.POST("/previous", handlePreviousSong)
			admin.POST("/refill", handleRefill)
		}
	}

	// --- STATIC FILES (React SPA Build) ---
	r.Static("/static", "./frontend/build/static")
	r.StaticFile("/favicon.ico", "./frontend/build/favicon.ico")
	r.StaticFile("/manifest.json", "./frontend/build/manifest.json")

	r.StaticFile("/.well-known/apple-developer-merchantid-domain-association", "./static/apple-developer-merchantid-domain-association")

	// Catch-all for React Router
	r.NoRoute(func(c *gin.Context) {
		c.File("./frontend/build/index.html")
	})

	// Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on port %s", port)
	r.Run(":" + port)
}

// --- AUTH MIDDLEWARE ---

func AdminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		correctPassword := os.Getenv("ADMIN_PASSWORD")
		if correctPassword == "" {
			correctPassword = "ClassicalRemix"
		}

		providedPassword := c.GetHeader("X-Admin-Password")
		if providedPassword != correctPassword {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized access"})
			c.Abort()
			return
		}
		c.Next()
	}
}
