package main

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
	"strings"

	"cloud.google.com/go/firestore"
)

type Song struct {
	Title       string `firestore:"title"`
	Artist      string `firestore:"artist"`
	AlbumArtURL string `firestore:"albumArtUrl"`
	Category    string `firestore:"category"`
}

func main() {
	ctx := context.Background()
	projectID := "jukebox-party-485415" // Your Project ID

	client, err := firestore.NewClient(ctx, projectID)
	if err != nil {
		log.Fatalf("Failed to create Firestore client: %v", err)
	}
	defer client.Close()

	file, err := os.Open("data/repertoire.csv")
	if err != nil {
		log.Fatalf("Failed to open CSV: %v", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	if _, err := reader.Read(); err != nil {
		log.Fatalf("Failed to read header: %v", err)
	}

	fmt.Println("🚀 Syncing library with corrected column mapping...")

	count := 0
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Fatal(err)
		}

		song := Song{
			Category:    strings.TrimSpace(record[0]),
			Artist:      strings.TrimSpace(record[1]),
			Title:       strings.TrimSpace(record[2]),
			AlbumArtURL: strings.TrimSpace(record[3]),
		}

		docID := createID(song.Title, song.Artist)

		_, err = client.Collection("library").Doc(docID).Set(ctx, song)
		if err != nil {
			log.Printf("❌ Failed to sync song %s: %v", song.Title, err)
		} else {
			count++
			if count%100 == 0 {
				fmt.Printf("✅ Synced %d pieces...\n", count)
			}
		}
	}

	fmt.Printf("\n✨ Success! %d songs synchronized correctly to the library.\n", count)
}

func createID(title, artist string) string {
	cleaner := strings.NewReplacer(
		"/", "-", " ", "-", "(", "", ")", "", ",", "",
		".", "", "'", "", "#", "sharp", "♭", "flat",
		":", "", "!", "", "?", "", "&", "and",
	)
	combined := fmt.Sprintf("%s-%s", strings.ToLower(artist), strings.ToLower(title))
	result := cleaner.Replace(combined)
	return strings.ReplaceAll(result, "--", "-")
}
