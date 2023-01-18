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
  deleteDoc,
  disableNetwork,
  enableNetwork,
  doc,
  enableIndexedDbPersistence,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  query,
  runTransaction,
  where,
  writeBatch,
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Query,
  QuerySnapshot,
  DocumentData
} from '@firebase/firestore';

import { log } from './common/logging.js';
import { TestEnvironment } from './common/test_environment';
import {
  createDocument,
  createDocuments,
  createEmptyCollection,
  generateValue
} from './common/util.js';

/**
 * Runs the test.
 *
 * Replace the body of this function with the code you would like to execute
 * when the user clicks the "Run Test" button in the UI.
 *
 * @param db the `Firestore` instance to use.
 * @param env extra information about the given Firestore instance and some
 * helper methods.
 */
export async function runTheTest(
  db: Firestore,
  env: TestEnvironment
): Promise<void> {
  const collectionRef = createEmptyCollection(db, 'v9web-demo-');
  const createdDocumentData = { foo: generateValue() };
  const documentRef = await createDocument(
    collectionRef,
    'doc1',
    createdDocumentData
  );
  env.cancellationToken?.throwIfCancelled();

  log(`getDoc(${documentRef.id})`);
  const snapshot1 = await getDoc(documentRef);
  log(
    `getDoc(${documentRef.id}) returned: ${JSON.stringify(snapshot1.data())}`
  );
  env.cancellationToken?.throwIfCancelled();

  const dataToSet = { foo: createdDocumentData.foo + '-NEW' };
  log(`setDoc(${documentRef.id}, ${JSON.stringify(dataToSet)})`);
  await setDoc<DocumentData>(documentRef, dataToSet);
  env.cancellationToken?.throwIfCancelled();

  log(`getDoc(${documentRef.id})`);
  const snapshot = await getDoc(documentRef);
  log(`getDoc(${documentRef.id}) returned: ${JSON.stringify(snapshot.data())}`);
  env.cancellationToken?.throwIfCancelled();
}
