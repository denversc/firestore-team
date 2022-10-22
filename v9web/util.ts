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
  Firestore
} from '@firebase/firestore';

import { log } from './logging';

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
): Promise<CreatedDocuments<T>> {
  const writeBatch_ = writeBatch(collectionRef.firestore);
  const createdDocuments = Object.fromEntries(
    Object.entries(documentSpecs).map(([documentId]) => [
      documentId,
      doc(collectionRef, documentId)
    ])
  ) as CreatedDocuments<T>;

  for (const [documentId, documentData] of Object.entries(documentSpecs)) {
    const documentRef = createdDocuments[documentId];
    log(
      `Creating document ${documentRef.path} with contents: ${JSON.stringify(
        documentData
      )}`
    );
    writeBatch_.set(documentRef, documentData);
  }

  await writeBatch_.commit();

  return createdDocuments;
}
