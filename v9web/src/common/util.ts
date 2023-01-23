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

import {
  collection,
  doc,
  writeBatch,
  DocumentData,
  DocumentReference,
  CollectionReference,
  Firestore,
  WriteBatch
} from '@firebase/firestore';

import { log } from './logging.js';

/**
 * Generates and returns a random-ish number.
 *
 * The returned number will be 3 digits and will increase by roughly 10 each
 * second. This makes it a useful value for a document whose field is set
 * repeatedly because the value will increase monotonically, and it is easy for
 * a human to order the values.
 */
export function generateValue(): string {
  const value = `${Math.round(Date.now() / 250)}`;
  return value.substring(value.length - 3);
}

/**
 * Generates a random string suitable for a globally unique collection or
 * document ID.
 *
 * @param db a Firestore instance to use.
 * @return a randomly-generated string suitable suitable for a globally unique
 * collection or document ID.
 */
export function generateUniqueResourceId(db: Firestore): string {
  return doc(collection(db, 'dummy')).id;
}

/**
 * Formats an elapsed time into a human-friendly string.
 *
 * @param startTime the start time.
 * @param endTime the end time.
 * @returns A human-friendly string that indicates the amount of time that has
 * elapsed between the given `startTime` and `endTime`.
 */
export function formatElapsedTime(
  startTime: DOMHighResTimeStamp,
  endTime: DOMHighResTimeStamp
): string {
  const milliseconds = endTime - startTime;
  const minutes = Math.floor(milliseconds / (1000 * 60));
  const seconds = (milliseconds - minutes * 1000 * 60) / 1000;

  const formattedSeconds = seconds.toFixed(3) + 's';
  if (minutes == 0) {
    return formattedSeconds;
  } else {
    return `${minutes}m ${formattedSeconds}`;
  }
}

/**
 * Creates and returns a new, empty collection in the given Firestore database.
 *
 * @param db the Firestore database in which to create the collection.
 * @param namePrefix a string to prepend to the name of the collection.
 * @return a newly-created, empty collection in the given Firestore database.
 */
export function createEmptyCollection(
  db: Firestore,
  namePrefix?: string
): CollectionReference {
  const collectionId = (namePrefix ?? '') + generateUniqueResourceId(db);
  return collection(db, collectionId);
}

export interface DocumentSpecs {
  [docId: string]: DocumentData;
}

export type CreatedDocuments<T extends DocumentSpecs> = {
  [P in keyof T]: DocumentReference;
};

/**
 * Creates a document in the given Firestore collection.
 *
 * @param collectionRef The collection in which to create the documents.
 * @param documentId the ID (name) of the document to create.
 * @param documentData the data to populate the document with.
 * @return the `DocumentReference` of the created document.
 */
export async function createDocument<T extends DocumentSpecs>(
  collectionRef: CollectionReference,
  documentId: string,
  documentData: DocumentData
): Promise<DocumentReference> {
  return (await createDocuments(collectionRef, { [documentId]: documentData }))[
    documentId
  ];
}

/**
 * Creates documents in the given Firestore collection.
 *
 * @param collectionRef The collection in which to create the documents.
 * @param documentCreateCount the number of documents to create.
 * @param documentData the data with which to populate the documents; if omitted
 * or undefined, then choose some random data that will be the same in every
 * document.
 * @return the created documents, sorted by their name.
 */
export async function createDocuments(
  collectionRef: CollectionReference,
  documentCreateCount: number,
  documentData?: DocumentData
): Promise<Array<DocumentReference>>;

/**
 * Creates documents in the given Firestore collection.
 *
 * @param collectionRef The collection in which to create the documents.
 * @param documentSpecs the documents to create.
 * @return the created documents; this object will have the same keys as the
 * given `documentSpecs` object, but with the corresponding `DocumentReference`
 * of the document that was created.
 */
export async function createDocuments<T extends DocumentSpecs>(
  collectionRef: CollectionReference,
  documentSpecs: T
): Promise<CreatedDocuments<T>>;

export function createDocuments<T extends DocumentSpecs>(
  collectionRef: CollectionReference,
  documentSpecsOrDocumentCreateCount: T | number,
  documentData?: DocumentData
): Promise<CreatedDocuments<T>> | Promise<Array<DocumentReference>> {
  if (typeof documentSpecsOrDocumentCreateCount === 'number') {
    return createDocumentsFromDocumentCreateCount(
      collectionRef,
      documentSpecsOrDocumentCreateCount,
      documentData
    );
  } else {
    return createDocumentsFromDocumentSpecs(
      collectionRef,
      documentSpecsOrDocumentCreateCount
    );
  }
}

async function createDocumentsFromDocumentSpecs<T extends DocumentSpecs>(
  collectionRef: CollectionReference,
  documentSpecs: T
): Promise<CreatedDocuments<T>> {
  const createdDocuments = Object.fromEntries(
    Object.entries(documentSpecs).map(([documentId, _]) => [
      documentId,
      doc(collectionRef, documentId)
    ])
  ) as CreatedDocuments<T>;

  await performWritesInBatches(
    collectionRef.firestore,
    Object.entries(documentSpecs),
    (writeBatch_, [documentId, documentData]) => {
      const documentRef = createdDocuments[documentId];
      log(
        `Creating document ${documentRef.path} with contents: ${JSON.stringify(
          documentData
        )}`
      );
      writeBatch_.set(documentRef, documentData);
    }
  );

  return createdDocuments;
}

async function createDocumentsFromDocumentCreateCount<T extends DocumentSpecs>(
  collectionRef: CollectionReference,
  documentCreateCount: number,
  documentData?: DocumentData
): Promise<Array<DocumentReference>> {
  const documentRefs: Array<DocumentReference> = [];
  for (let i = 0; i < documentCreateCount; i++) {
    documentRefs.push(doc(collectionRef));
  }
  documentRefs.sort((docRef1, docRef2) => docRef1.id.localeCompare(docRef2.id));

  let nextDocumentNumber = 1;

  await performWritesInBatches(
    collectionRef.firestore,
    documentRefs,
    (writeBatch_, documentRef) => {
      let documentDataForCurrentDocument = documentData ?? {
        sampleKey: 42,
        docNumber: nextDocumentNumber
      };
      nextDocumentNumber++;
      log(
        `Creating document ${documentRef.path} with contents: ${JSON.stringify(
          documentDataForCurrentDocument
        )}`
      );
      writeBatch_.set(documentRef, documentDataForCurrentDocument);
    }
  );

  return documentRefs;
}

function performWritesInBatches<T>(
  db: Firestore,
  items: Array<T>,
  callback: (writeBatch_: WriteBatch, item: T) => void
): Promise<unknown> {
  const writeBatches: Array<WriteBatch> = [];
  let writeBatch_: WriteBatch | null = null;
  let currentWriteBatchWriteCount = 0;

  for (const item of items) {
    if (writeBatch_ === null) {
      writeBatch_ = writeBatch(db);
      currentWriteBatchWriteCount = 0;
    }

    callback(writeBatch_, item);
    currentWriteBatchWriteCount++;

    if (currentWriteBatchWriteCount === 500) {
      writeBatches.push(writeBatch_);
      writeBatch_ = null;
    }
  }

  if (writeBatch_ !== null) {
    writeBatches.push(writeBatch_);
  }

  return Promise.all(writeBatches.map(batch => batch.commit()));
}

/**
 * The IDs of known Firestore hosts.
 */
export type FirestoreHost = 'prod' | 'emulator' | 'nightly' | 'qa';

/** Returns the host name for the given Firestore host. */
export function hostNameFromHost(host: FirestoreHost): string {
  switch (host) {
    case 'prod':
      return 'firestore.googleapis.com';
    case 'emulator':
      return '127.0.0.1';
    case 'nightly':
      return 'test-firestore.sandbox.googleapis.com';
    case 'qa':
      return 'staging-firestore.sandbox.googleapis.com';
  }
  throw new UnknownFirestoreHostError(host);
}

export function displayValueFromHost(hostId: FirestoreHost): string {
  const label = displayLabelFromHost(hostId);
  const hostName = hostNameFromHost(hostId);
  return `${label} (${hostName})`;
}

export function displayLabelFromHost(hostId: FirestoreHost): string {
  switch (hostId) {
    case 'prod':
      return 'Production';
    case 'emulator':
      return 'Emulator';
    case 'nightly':
      return 'Nightly';
    case 'qa':
      return 'QA';
  }
  throw new UnknownFirestoreHostError(hostId);
}

/**
 * Returns whether the given value is a "placeholder" value for `PROJECT_ID` or
 * `API_KEY` that is committed into the GitHub repository.
 *
 * This function is used to test whether these constants were modified, as
 * documented, to contain valid data.
 */
export function isPlaceholderValue(value: string): boolean {
  return value.startsWith('REPLACE_WITH_YOUR_');
}

/**
 * Exception thrown if a method is given a string that is not equal to one of
 * strings in the `FirestoreHost` union type.
 */
export class UnknownFirestoreHostError extends Error {
  name = 'UnknownFirestoreHostError';

  constructor(host: string) {
    super(`unknown host: ${host}`);
  }
}

/**
 * The exception thrown when the PROJECT_ID is not set to a valid value, but is
 * instead left with the placeholder, and a valid value is required.
 */
export class PlaceholderProjectIdNotAllowedError extends Error {
  name = 'PlaceholderProjectIdNotAllowedError';
}
