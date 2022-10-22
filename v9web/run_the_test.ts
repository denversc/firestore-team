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

import { setDoc, getDoc, Firestore } from '@firebase/firestore';

import { log } from './logging';
import { createDocuments, createEmptyCollection, generateValue } from './util';

/**
 * Runs the test.
 *
 * Replace the body of this function with the code you would like to execute
 * when the user clicks the "Run Test" button in the UI.
 *
 * @param db the `Firestore` instance to use.
 */
export async function runTheTest(db: Firestore) {
  const collectionRef = createEmptyCollection(db, 'v9web-demo-');
  const documentsToCreate = { doc1: { foo: generateValue() } };
  const createdDocuments = await createDocuments(
    collectionRef,
    documentsToCreate
  );
  const documentRef = createdDocuments.doc1;

  log(`getDoc(${documentRef.id})`);
  const snapshot1 = await getDoc(documentRef);
  log(
    `getDoc(${documentRef.id}) returned: ${JSON.stringify(snapshot1.data())}`
  );

  const dataToSet = { foo: documentsToCreate.doc1.foo + '-NEW' };
  log(`setDoc(${documentRef.id}, ${JSON.stringify(dataToSet)})`);
  await setDoc(documentRef, dataToSet);

  log(`getDoc(${documentRef.id})`);
  const snapshot = await getDoc(documentRef);
  log(`getDoc(${documentRef.id}) returned: ${JSON.stringify(snapshot.data())}`);
}