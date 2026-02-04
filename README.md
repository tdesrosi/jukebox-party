
Firebase API Key Upload to Secret Manager:

```
echo -n "AIzaSy..." | gcloud secrets versions add REACT_APP_FIREBASE_API_KEY --data-file=-
```

Running the projector:

```
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --incognito --kiosk --user-data-dir=$(mktemp -d) http://localhost:3000/projector
```