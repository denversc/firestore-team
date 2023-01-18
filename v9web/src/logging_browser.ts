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

/** Clears the messages logged via `log()` from the UI. */
export function clearLogs(): void {
  getLogHtmlElement().textContent = '';
  getClearLogsButton().hidden = true;
}

export interface LogOptions {
  alsoLogToConsole: boolean;
}

/** Logs a message to the UI and console.log(). */
export function log(message: string, options: unknown): void {
  getClearLogsButton().hidden = false;
  const typedOptions = options as Partial<LogOptions>;
  const alsoLogToConsole = typedOptions?.alsoLogToConsole ?? true;
  const htmlElement = getLogHtmlElement();
  if (!htmlElement.textContent) {
    htmlElement.textContent = message;
  } else {
    htmlElement.textContent += '\n' + message;
  }
  if (alsoLogToConsole) {
    console.log(message);
  }
}

/** Gets the HTML element that contains the logged messages. */
function getLogHtmlElement(): HTMLElement {
  return document.getElementById('logOutput')!;
}

/** Gets the HTML button element that clears the logs. */
function getClearLogsButton(): HTMLElement {
  return document.getElementById('btnClearLogs')!;
}
