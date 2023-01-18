/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { FirebaseOptions, initializeApp } from '@firebase/app';
import {
  connectFirestoreEmulator,
  Firestore,
  FirestoreSettings,
  getFirestore,
  initializeFirestore,
  setLogLevel,
  terminate
} from '@firebase/firestore';

import { parseArgs, ParsedArgs } from './arg_parser_node.js';
import {
  hostNameFromHost,
  isPlaceholderValue,
  PlaceholderProjectIdNotAllowedError
} from './firebase_config.js';

import { runTheTest } from './run_the_test.js';
import { CancellationTokenSource } from './cancellation_token.js';
import { log, setLogFunction } from './logging.js';
import { log as nodeLog } from './logging_node.js';
import { formatElapsedTime } from './util.js';

// Initialize the logging framework.
setLogFunction(nodeLog);

/**
 * Create the `Firestore` object and return it.
 */
function setupFirestore(options: ParsedArgs): Firestore {
  const { apiKey, debugLoggingEnabled, host, projectId } = options;
  const hostName = hostNameFromHost(host);

  // Verify that the Project ID is set to something other than the default if
  // the Firestore emulator is not being used. The default Project ID works with
  // the emulator, but will cause strange errors if used against prod.
  if (host !== 'emulator' && isPlaceholderValue(projectId)) {
    throw new PlaceholderProjectIdNotAllowedError(
      'The Project ID needs to be set in firebase_config.ts or specified on ' +
        'the command-line unless using the Firestore emulator.'
    );
  }

  const firebaseConfig: FirebaseOptions = { projectId };
  if (!isPlaceholderValue(apiKey)) {
    firebaseConfig.apiKey = apiKey;
  }

  log(`initializeApp(${JSON.stringify(firebaseConfig)})`);
  const app = initializeApp(firebaseConfig);

  if (options.debugLoggingEnabled) {
    const logLevel = 'debug';
    log(`setLogLevel(${logLevel})`);
    setLogLevel(logLevel);
  }

  let db: Firestore;
  if (host === 'prod' || host === 'emulator') {
    log('getFirestore()');
    db = getFirestore(app);
  } else {
    const firestoreSettings: FirestoreSettings = { host: hostName };
    log(`initializeFirestore(${JSON.stringify(firestoreSettings)})`);
    db = initializeFirestore(app, firestoreSettings);
  }

  if (host === 'emulator') {
    log(`connectFirestoreEmulator(db, ${hostName}, 8080)`);
    connectFirestoreEmulator(db, hostName, 8080);
  }

  return db;
}

/**
 * Callback invoked whenever the "Enable Debug Logging" checkbox's checked state
 * changes.
 *
 * Sets up the `Firestore` instance and invoke the `runTheTest()` function from
 * `run_the_test.ts`.
 */
async function go() {
  const parsedArgs = parseArgs();

  // Since there is no way to cancel when running in Node.js, just use a
  // CancellationToken that will never be cancelled.
  const cancellationToken = new CancellationTokenSource().cancellationToken;

  const startTime: DOMHighResTimeStamp = performance.now();
  log(`Test Started`);
  try {
    const db = setupFirestore(parsedArgs);
    try {
      await runTheTest(db, cancellationToken);
    } finally {
      log('Terminating Firestore');
      await terminate(db);
    }
  } catch (e) {
    if (e instanceof Error) {
      log(`ERROR: ${e.message}`, { alsoLogToConsole: false });
      console.log(e.stack);
    } else {
      log(`ERROR: ${e}`);
    }
  }
  const endTime: DOMHighResTimeStamp = performance.now();
  const elapsedTimeStr = formatElapsedTime(startTime, endTime);
  log(`Test completed in ${elapsedTimeStr}`);
}

// Run the program!
go();
