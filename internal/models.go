package internal

type Song struct {
	ID          string `json:"id" firestore:"-"` // - Firestore won't save this field
	Category    string `json:"category" firestore:"category"`
	Artist      string `json:"artist" firestore:"artist"`
	Title       string `json:"title" firestore:"title"`
	AlbumArtURL string `json:"albumArtUrl" firestore:"albumArtUrl"`
}

type PartyState struct {
	Credits  int  `json:"credits" firestore:"credits"`
	IsActive bool `json:"isActive" firestore:"isActive"`
}
