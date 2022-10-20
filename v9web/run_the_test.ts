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

import { doc, setDoc, getDoc, Firestore } from '@firebase/firestore';

import { log } from './logging';
import { generateValue } from './util';

/**
 * Runs the test.
 *
 * Replace the body of this function with the code you would like to execute
 * when the user clicks the "Run Test" button in the UI.
 *
 * @param db the `Firestore` instance to use.
 */
export async function runTheTest(db: Firestore) {
  const doc_ = doc(db, 'coll/doc');

  log(`getDoc(${doc_.path})`);
  const snapshot1 = await getDoc(doc_);
  if (snapshot1.exists()) {
    log(`getDoc(${doc_.path}) returned: ${JSON.stringify(snapshot1.data())}`);
  } else {
    log(`getDoc(${doc_.path}) returned: [document does not exist]`);
  }

  const dataToSet = { foo: generateValue() };
  log(`setDoc(${doc_.path}, ${JSON.stringify(dataToSet)})`);
  await setDoc(doc_, dataToSet);

  log(`getDoc(${doc_.path})`);
  const snapshot = await getDoc(doc_);
  log(`getDoc(${doc_.path}) returned: ${JSON.stringify(snapshot.data())}`);
}
