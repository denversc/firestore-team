## Usage

1. Edit `firebase_config.ts` to fill out your `apiKey` and `projectId`
   (optional if you only want to use the Firestore emulator).
2. Edit `run_the_test.ts` to run whatever test you want to run.
3. Run `npm run build` to generate the compiled JavaScript.
4. Open `index.html` in a web browser, and click the "Run Test" button.

## Using your own v9 SDK:


```
cd firebase/firebase-js-sdk/packages/firestore
yarn build
yarn pack  # this resulted in a tar file (e.g. firebase-firestore-v3.4.4.tgz)
cp firebase-firestore-v3.4.4.tgz ~/myproject/
cd ~/myproject
npm install ./firebase-firestore-v3.4.4.tgz
webpack --mode=development 
firebase deploy --only hosting
```
