## Common Setup for both Browser and Node

1. Run `npm install` or `yarn install` to install dependencies.
2. Edit `src/firebase_config.ts` to fill out your `apiKey` and `projectId`
   (not required if you only want to use the Firestore emulator).
3. Edit `src/run_the_test.ts` to run whatever code you want to run.

## Run in a Browser

1. Run `npm run build` or `yarn build` to generate the compiled JavaScript.
2. Run `npm run serve` or `yarn serve` to start an HTTP server.
3. Open `http://localhost:9080/` in a web browser.
4. Click the "Run Test" button.

## Run in Node.js

1. Run `npm run run` or `yarn run run` to run the code in Node.

To connect to the Firestore emulator, specify `-e`.
To enable Firestore debug logging, specify `-v`.

Example:

```
npm run run -- -e -v
```

# Using your own v9 SDK:

```
cd ~/firebase-js-sdk/packages/firestore
yarn build:debug
yarn pack  # this creates a tar file (e.g. firebase-firestore-v3.4.4.tgz)
cd ~/firestore-team/v9web
npm install firebase-firestore-v3.4.4.tgz
```

## Formatting Code

This repository uses "prettier" to format the code.
To run the code formatter, simply run

```
npm run prettier
```

or

```
yarn prettier
```
