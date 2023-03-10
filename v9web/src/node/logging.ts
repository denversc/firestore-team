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

import { LogMessage, setLogFunction } from '../common/logging.js';

// The function to use to perform logging in node.
function nodeLog(message: LogMessage): void {
  console.log(`${message.timestamp} ${message.text}`);
}

// Initialize the logging framework with node logging.
export function initialize(): void {
  setLogFunction(nodeLog);
}
