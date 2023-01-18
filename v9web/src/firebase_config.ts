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

/**
 * The Firebase Project ID to use.
 * Example: "my-cool-project"
 */
export const PROJECT_ID = 'REPLACE_WITH_YOUR_PROJECT_ID';

/**
 * The Firestore API key to use.
 * Example: "BTzaRyDNXIllFmlXIE4LmCzDQAYtITefbbixR4Z"
 */
export const API_KEY = 'REPLACE_WITH_YOUR_API_KEY';

/**
 * The IDs of known Firestore hosts.
 */
export type FirestoreHost = 'prod' | 'emulator' | 'nightly' | 'qa';

/**
 * The Firestore host to connect to.
 */
export const HOST: FirestoreHost = 'prod';

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
