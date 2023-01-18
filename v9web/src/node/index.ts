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

import { createHash } from 'node:crypto';

import { terminate } from '@firebase/firestore';

import {
  getFirestore,
  Hasher,
  setHasher,
  setBase64Encode
} from '../common/firestore_helper.js';
import { parseArgs, updateSettingsFromParsedArgs } from './arg_parser.js';
import { SettingsStorage, Settings } from '../common/settings.js';
import { runTheTest } from '../run_the_test.js';
import { CancellationTokenSource } from '../common/cancellation_token.js';
import { initialize as initializeLogging } from './logging.js';
import { log } from '../common/logging.js';
import { formatElapsedTime } from '../common/util.js';

class MemorySettingsStorage implements SettingsStorage {
  readonly map = new Map<string, string>();

  clear(key: string): void {
    this.map.delete(key);
  }

  load(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  save(key: string, value: string): void {
    this.map.set(key, value);
  }
}

class HasherImpl implements Hasher {
  private data: string = '';

  reset(): void {
    this.data = '';
  }

  update(
    bytes: Array<number> | Uint8Array | string,
    opt_length?: number | undefined
  ): void {
    if (opt_length !== undefined) {
      // opt_length can be implemented if it's ever needed.
      throw new Error('opt_length is not supported');
    }

    if (bytes instanceof Array || bytes instanceof Uint8Array) {
      bytes.forEach(b => (this.data += b));
    } else {
      this.data += bytes;
    }
  }

  digest(): Array<number> {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(this.data);
    return Array.from(createHash('md5').update(encodedData).digest());
  }
}

function base64Encode(data: string): string {
  return Buffer.from(data, 'binary').toString('base64');
}

/**
 * Callback invoked whenever the "Enable Debug Logging" checkbox's checked state
 * changes.
 *
 * Sets up the `Firestore` instance and invoke the `runTheTest()` function from
 * `run_the_test.ts`.
 */
async function go() {
  setHasher(new HasherImpl());
  setBase64Encode(base64Encode);

  initializeLogging();

  const parsedArgs = parseArgs();
  const settings = Settings.load(new MemorySettingsStorage());
  updateSettingsFromParsedArgs(parsedArgs, settings);

  // Since there is no way to cancel when running in Node.js, just use a
  // CancellationToken that will never be cancelled.
  const cancellationToken = new CancellationTokenSource().cancellationToken;

  const startTime: DOMHighResTimeStamp = performance.now();
  log(`Test Started`);
  try {
    const db = getFirestore(settings);
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
