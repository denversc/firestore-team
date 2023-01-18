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

import { setLogFunction } from '../common/logging.js';
import { MainUi } from './ui';

/** Initialize the logging framework with browser logging. */
export function initialize(ui: MainUi): void {
  setLogFunction((message: string, options: unknown) => {
    browserLog(ui, message, options as Partial<LogOptions>);
  });
}

export interface LogOptions {
  alsoLogToConsole: boolean;
}

/** Logs a message to the UI and, by default, console.log(). */
function browserLog(
  ui: MainUi,
  message: string,
  options: Partial<LogOptions>
): void {
  ui.setClearLogsButtonVisible(true);
  ui.appendToLogOutput(message);
  if (options?.alsoLogToConsole ?? true) {
    console.log(message);
  }
}
