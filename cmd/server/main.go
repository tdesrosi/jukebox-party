package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
	"github.com/tdesrosi/jukebox-party/internal"
)

var client *firestore.Client

func main() {
	ctx := context.Background()
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		projectID = "jukebox-party-485415" // Hardcoded fallback for local testing
	}

	// Initialize Firestore
	var err error
	client, err = firestore.NewClient(ctx, projectID)
	if err != nil {
		log.Fatalf("Failed to create Firestore client: %v", err)
	}
	defer client.Close()

	r := gin.Default()

	// Serve public assets
	r.StaticFile("/classical-remix.jpeg", "./frontend/public/classical-remix.jpeg")

	// --- API ROUTES ---
	api := r.Group("/api")
	{
		// 1. Public Endpoints
		api.GET("/library", handleLibrary)
		api.POST("/request", handleRequest)

		// 2. Auth Endpoint
		api.POST("/auth/verify", handleVerify)

		// 3. Protected Admin Endpoints
		admin := api.Group("/admin")
		admin.Use(AdminAuthMiddleware())
		{
			admin.POST("/next", handleNextSong)
			admin.POST("/previous", handlePreviousSong)
			admin.POST("/refill", handleRefill)
		}
	}

	// --- STATIC FILES (React Build) ---
	r.Static("/static", "./frontend/build/static")
	r.StaticFile("/favicon.ico", "./frontend/build/favicon.ico")
	r.StaticFile("/manifest.json", "./frontend/build/manifest.json")

	// Single Page App (SPA) catch-all
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

// --- MIDDLEWARE ---

func AdminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Use environment variable in production
		correctPassword := os.Getenv("ADMIN_PASSWORD")
		if correctPassword == "" {
			correctPassword = "1234" // Default for testing
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

// --- HANDLERS ---

func handleLibrary(c *gin.Context) {
	docs, err := client.Collection("library").Documents(context.Background()).GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var library []internal.Song
	for _, doc := range docs {
		var s internal.Song
		doc.DataTo(&s)
		s.ID = doc.Ref.ID
		library = append(library, s)
	}
	c.JSON(http.StatusOK, library)
}

func handleVerify(c *gin.Context) {
	var req struct {
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"valid": false})
		return
	}

	correctPassword := os.Getenv("ADMIN_PASSWORD")
	if correctPassword == "" {
		correctPassword = "1234"
	}

	if req.Password == correctPassword {
		c.JSON(http.StatusOK, gin.H{"valid": true})
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{"valid": false})
	}
}

func handleRequest(c *gin.Context) {
	var req struct {
		SongID   string `json:"songId"`
		UserName string `json:"userName"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	ctx := context.Background()
	err := client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		stateRef := client.Collection("party").Doc("current_state")
		doc, err := tx.Get(stateRef)
		if err != nil {
			return err
		}

		credits, _ := doc.DataAt("credits")
		if credits.(int64) <= 0 {
			return fmt.Errorf("no credits remaining")
		}

		songRef := client.Collection("library").Doc(req.SongID)
		songDoc, err := tx.Get(songRef)
		if err != nil {
			return err
		}

		queueRef := client.Collection("queue").NewDoc()
		err = tx.Create(queueRef, map[string]interface{}{
			"title":       songDoc.Data()["title"],
			"artist":      songDoc.Data()["artist"],
			"albumArtUrl": songDoc.Data()["albumArtUrl"],
			"requestedBy": req.UserName,
			"isCompleted": false,
			"timestamp":   firestore.ServerTimestamp,
		})
		if err != nil {
			return err
		}

		// 4. Deduct Credit
		return tx.Update(stateRef, []firestore.Update{{Path: "credits", Value: firestore.Increment(-1)}})
	})

	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Request logged!"})
}

func handleNextSong(c *gin.Context) {
	var req struct {
		DocID string `json:"docId"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	_, err := client.Collection("queue").Doc(req.DocID).Update(context.Background(), []firestore.Update{
		{Path: "isCompleted", Value: true},
	})

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "Advanced to next song"})
}

func handlePreviousSong(c *gin.Context) {
	ctx := context.Background()
	query := client.Collection("queue").
		Where("isCompleted", "==", true).
		OrderBy("timestamp", firestore.Desc).
		Limit(1)

	docs, err := query.Documents(ctx).GetAll()
	if err != nil || len(docs) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "No previous songs found"})
		return
	}

	_, err = docs[0].Ref.Update(ctx, []firestore.Update{{Path: "isCompleted", Value: false}})
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to revert"})
		return
	}
	c.JSON(200, gin.H{"status": "Reverted"})
}

func handleRefill(c *gin.Context) {
	var req struct {
		Amount int64 `json:"amount"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid amount"})
		return
	}

	stateRef := client.Collection("party").Doc("current_state")
	_, err := stateRef.Update(context.Background(), []firestore.Update{
		{Path: "credits", Value: firestore.Increment(req.Amount)},
	})

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"status": "Credits added"})
}
