package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v84"
	"github.com/stripe/stripe-go/v84/checkout/session"
	"github.com/stripe/stripe-go/v84/webhook"
	"github.com/tdesrosi/jukebox-party/internal"
)

// --- CORE HANDLERS ---

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

// Kiosk Request Handler (Uses Physical Ticket Pool)
func handleRequest(c *gin.Context) {
	kioskSecret := c.GetHeader("X-Kiosk-Secret")
	masterSecret := os.Getenv("KIOSK_MASTER_KEY")
	if masterSecret == "" {
		masterSecret = "classical-remix-kiosk"
	}

	if kioskSecret != masterSecret {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: Not an authorized kiosk"})
		return
	}

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
			return fmt.Errorf("no kiosk credits remaining")
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
			"source":      "kiosk",
		})
		if err != nil {
			return err
		}

		return tx.Update(stateRef, []firestore.Update{{Path: "credits", Value: firestore.Increment(-1)}})
	})

	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Kiosk request logged!"})
}

// --- STRIPE INTEGRATION ---

func handleCreateCheckoutSession(c *gin.Context) {
	var req struct {
		SongID   string `json:"songId"`
		UserName string `json:"userName"`
		Amount   int64  `json:"amount"` // Amount in cents sent from frontend
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// SECURITY: Enforce a minimum of $5.00 (500 cents) server-side
	// This prevents users from manipulating the frontend to pay less.
	finalAmount := req.Amount
	if finalAmount < 500 {
		finalAmount = 500
	}

	domain := os.Getenv("DOMAIN_NAME")
	if domain == "" {
		domain = "https://" + c.Request.Host
	}

	params := &stripe.CheckoutSessionParams{
		SuccessURL:         stripe.String(domain + "/picker?payment=success"),
		CancelURL:          stripe.String(domain + "/picker?payment=cancelled"),
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		Mode:               stripe.String(string(stripe.CheckoutSessionModePayment)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("usd"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String("Mobile Song Request"),
						Description: stripe.String("Live request for the Classical Remix Music Festival"),
					},
					// Use the dynamic amount from the request
					UnitAmount: stripe.Int64(finalAmount),
				},
				Quantity: stripe.Int64(1),
			},
		},
		Metadata: map[string]string{
			"songId":   req.SongID,
			"userName": req.UserName,
		},
	}

	s, err := session.New(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": s.URL})
}

func handleStripeWebhook(c *gin.Context) {
	const MaxBodyBytes = int64(65536)
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxBodyBytes)
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	endpointSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	signatureHeader := c.GetHeader("Stripe-Signature")
	event, err := webhook.ConstructEvent(payload, signatureHeader, endpointSecret)
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	if event.Type == "checkout.session.completed" {
		var session stripe.CheckoutSession

		// Use json.Unmarshal on the raw object data
		err := json.Unmarshal(event.Data.Raw, &session)
		if err != nil {
			log.Printf("Error unmarshaling Stripe session: %v", err)
			c.Status(http.StatusInternalServerError)
			return
		}

		// Now you can safely access metadata
		songID := session.Metadata["songId"]
		userName := session.Metadata["userName"]

		if songID != "" {
			ctx := context.Background()
			songRef := client.Collection("library").Doc(songID)
			songDoc, err := songRef.Get(ctx)

			if err == nil {
				queueRef := client.Collection("queue").NewDoc()
				_, _ = queueRef.Create(ctx, map[string]interface{}{
					"title":       songDoc.Data()["title"],
					"artist":      songDoc.Data()["artist"],
					"albumArtUrl": songDoc.Data()["albumArtUrl"],
					"requestedBy": userName,
					"isCompleted": false,
					"timestamp":   firestore.ServerTimestamp,
					"source":      "stripe",
				})
				log.Printf("Stripe request added to queue: %s by %s", songDoc.Data()["title"], userName)
			}
		}
	}

	c.Status(http.StatusOK)
}

// --- ADMIN HANDLERS ---

func handleVerify(c *gin.Context) {
	var req struct {
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"valid": false})
		return
	}

	// 1. Get Passwords from Env (Works on Local & Cloud)
	correctPassword := os.Getenv("ADMIN_PASSWORD")
	if correctPassword == "" {
		correctPassword = "ClassicalRemix" // Default for safety
	}

	if req.Password == correctPassword {
		// 2. Fetch the Kiosk Key to send back
		kioskKey := os.Getenv("KIOSK_MASTER_KEY")
		if kioskKey == "" {
			kioskKey = "classical-remix-ipad" // Default fallback
		}

		// 3. Return it securely
		c.JSON(http.StatusOK, gin.H{
			"valid":       true,
			"kioskSecret": kioskKey,
		})
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{"valid": false})
	}
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
	query := client.Collection("queue").Where("isCompleted", "==", true).OrderBy("timestamp", firestore.Desc).Limit(1)
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
