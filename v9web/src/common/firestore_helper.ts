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

import { initializeApp, FirebaseApp } from '@firebase/app';
import {
  connectFirestoreEmulator,
  Firestore,
  getFirestore,
  initializeFirestore
} from '@firebase/firestore';

import {
  isPlaceholderValue,
  PlaceholderProjectIdNotAllowedError
} from './util.js';
import { log } from './logging.js';
import { Settings } from './settings.js';

/** A hasher, such as Md5 from the Google Closure Library. */
export interface Hasher {
  reset(): void;
  update(
    bytes: Array<number> | Uint8Array | string,
    opt_length?: number | undefined
  ): void;
  digest(): Array<number>;
}

let hasher: Hasher | null = null;

export function setHasher(hasherToSet: Hasher): void {
  if (hasher !== null) {
    throw new Error('hasher has already been set');
  }
  hasher = hasherToSet;
}

/** A function that encodes a binary string to base64, such as btoa(). */
export type Base64Encode = (data: string) => string;
let base64Encode: Base64Encode | null = null;

export function setBase64Encode(base64EncodeToSet: Base64Encode): void {
  if (base64Encode !== null) {
    throw new Error('base64 encode function has already been set');
  }
  base64Encode = base64EncodeToSet;
}

class FirebaseObjectCache<T> {
  private readonly cachedObjectsByKey = new Map<string, T>();

  get(host: string, projectId: string, apiKey: string): T | null {
    const key = FirebaseObjectCache.key(host, projectId, apiKey);
    return this.cachedObjectsByKey.get(key) ?? null;
  }

  set(host: string, projectId: string, apiKey: string, object: T): void {
    const key = FirebaseObjectCache.key(host, projectId, apiKey);
    if (this.cachedObjectsByKey.has(key)) {
      throw new Error(
        `Entry for host=${host} projectId=${projectId} apiKey=${apiKey} already exists`
      );
    }
    this.cachedObjectsByKey.set(key, object);
  }

  private static key(host: string, projectId: string, apiKey: string): string {
    return `${host}%${projectId}%${apiKey}`;
  }
}

function stableFirebaseAppNameFrom(
  host: string,
  projectId: string,
  apiKey: string
): string {
  const encoder = new TextEncoder();
  const encodedValue = encoder.encode(`${host}%${projectId}%${apiKey}`);

  if (!hasher) {
    throw new Error('hasher is needed but hash not yet been initialized');
  }
  if (!base64Encode) {
    throw new Error(
      'base64 encode function is needed but hash not yet been initialized'
    );
  }

  hasher.reset();
  hasher.update(encodedValue);
  const digest = hasher.digest();
  const digestByteString = digest.map(n => String.fromCharCode(n)).join('');
  const base64Digest = base64Encode(digestByteString);

  return Array.from(base64Digest)
    .filter(c => c !== '=')
    .join('');
}

const firebaseAppCache = new FirebaseObjectCache<FirebaseApp>();
const firestoreInstanceCache = new FirebaseObjectCache<Firestore>();

/**
 * Create the `Firestore` object and return it.
 */
function getOrCreateFirestore(settings: Settings): Firestore {
  const host = settings.host.value;
  const hostName = settings.host.hostName;
  const hostDisplayName = settings.host.displayValue;
  const projectId = settings.projectId.value;
  const apiKey = settings.apiKey.value;

  // Verify that the Project ID is set to something other than the default if
  // the Firestore emulator is not being used. The default Project ID works with
  // the emulator, but will cause strange errors if used against prod.
  if (host !== 'emulator' && isPlaceholderValue(projectId)) {
    throw new PlaceholderProjectIdNotAllowedError(
      'The Project ID needs to be set in firebase_config.ts, or in the ' +
        'Settings, unless using the Firestore emulator.'
    );
  }

  // Set the requested debug log level, if it has never been set before.
  if (!settings.debugLogEnabled.isApplied) {
    settings.debugLogEnabled.apply();
  }

  // Use a previously-cached Firestore instance, if available.
  const cachedDb = firestoreInstanceCache.get(host, projectId, apiKey);
  if (cachedDb !== null) {
    log(
      `Using existing Firestore instance with host ${hostDisplayName} ` +
        `and Project ID ${projectId}`
    );
    return cachedDb;
  }

  const cachedApp = firebaseAppCache.get(host, projectId, apiKey);
  let app: FirebaseApp;
  if (cachedApp !== null) {
    log(`Using existing FirebaseApp instance with Project ID ${projectId}`);
    app = cachedApp;
  } else {
    const appName = stableFirebaseAppNameFrom(host, projectId, apiKey);
    log(
      `initializeApp(projectId=${projectId}, apiKey=${apiKey}, ` +
        `appName=${appName})"`
    );
    app = initializeApp({ projectId, apiKey }, appName);
    firebaseAppCache.set(host, projectId, apiKey, app);
  }

  let db: Firestore;
  if (host === 'prod') {
    log(`getFirestore() for host ${hostDisplayName} (${host})`);
    db = getFirestore(app);
  } else if (host === 'emulator') {
    log('getFirestore()');
    db = getFirestore(app);
  } else {
    log(`initializeFirestore(app, { host: ${hostName} (${host}) }`);
    db = initializeFirestore(app, { host: hostName });
  }

  if (host === 'emulator') {
    log(`connectFirestoreEmulator(db, ${hostName}, 8080)`);
    connectFirestoreEmulator(db, hostName, 8080);
  }

  firestoreInstanceCache.set(host, projectId, apiKey, db);
  return db;
}

export { getOrCreateFirestore as getFirestore };
