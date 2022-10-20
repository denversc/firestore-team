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
 * Keep track of "time zero" so that all log statements can have an offset from
 * this "time zero". This makes it easy to see how long operations take, rather
 * than printing the wall clock time.
 */
export const logStartTime: DOMHighResTimeStamp = performance.now();

/** Clears the logs that have been posted to the UI. */
export function clearLogs() {
  getLogHtmlElement().innerHTML = '';
}

/** Logs a message to the UI and, optionally, `console.log()`. */
export function log(
  message: string,
  options?: { t?: DOMHighResTimeStamp; alsoLogToConsole?: boolean }
) {
  const messageStr = elapsedTimeStrFrom(options?.t) + ' ' + message;
  const htmlElement = getLogHtmlElement();
  htmlElement.appendChild(document.createTextNode(messageStr));
  htmlElement.appendChild(document.createElement('br'));
  if (options?.alsoLogToConsole ?? true) {
    console.log(messageStr);
  }
}

/** Gets the HTML element that contains the logged messages. */
function getLogHtmlElement(): HTMLElement {
  return document.getElementById('logPara')!;
}

/**
 * Creates and returns a "timestamp" string.
 *
 * The given timestamp is taken as an offset of `logStartTime`. This allows log
 * messages to start at "time 0" and make it easy for humans to calculate the
 * elapsed time.
 *
 * @param t - the timestamp to format; if not specified then `performance.now()`
 * is used.
 * @returns The timestamp string with which to prefix log lines added to the
 * UI, created from the given timestamp.
 */
function elapsedTimeStrFrom(t?: DOMHighResTimeStamp): string {
  if (!t) {
    t = performance.now();
  }

  const milliseconds = t - logStartTime;
  const minutes = Math.floor(milliseconds / (1000 * 60));
  const seconds = (milliseconds - minutes * 1000 * 60) / 1000;
  return (
    (minutes < 10 ? '0' : '') +
    minutes +
    ':' +
    (seconds < 10 ? '0' : '') +
    seconds.toFixed(3)
  );
}
