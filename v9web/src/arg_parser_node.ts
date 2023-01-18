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

import { API_KEY, FirestoreHost, HOST, PROJECT_ID } from './firebase_config.js';

// @ts-ignore
import yargs from 'yargs/yargs';

export interface ParsedArgs {
  debugLoggingEnabled: boolean;
  host: FirestoreHost;
  projectId: string;
  apiKey: string;
}

/**
 * Parses the command-line arguments.
 *
 * @return the parsed command-line arguments.
 */
export function parseArgs(): ParsedArgs {
  const parsedArgs: ParsedYargs = yargs(process.argv.slice(2))
    .strict()
    .options({
      projectId: {
        alias: 'p',
        type: 'string',
        describe: `The Firebase Project ID to use.`
      },
      apiKey: {
        type: 'string',
        describe: `The Firebase API key to use.`
      },
      prod: {
        type: 'boolean',
        describe: `Connect to the Firestore production.`
      },
      emulator: {
        alias: 'e',
        type: 'boolean',
        describe: `Connect to the Firestore emulator.`
      },
      nightly: {
        type: 'boolean',
        describe: `Connect to the Firestore nightly instance.`
      },
      qa: {
        type: 'boolean',
        describe: `Connect to the Firestore QA instance.`
      },
      quiet: {
        alias: 'q',
        type: 'boolean',
        describe: `Disable Firestore debug logging.`
      },
      debug: {
        alias: 'd',
        type: 'boolean',
        describe: `Enable Firestore debug logging.`
      }
    })
    .check(checkMutuallyExclusive('prod', 'emulator', 'nightly', 'qa'))
    .check(checkMutuallyExclusive('debug', 'quiet'))
    .help()
    .parseSync();

  return {
    debugLoggingEnabled: parsedArgs.debug ?? false,
    host: hostFromParsedArgs(parsedArgs),
    projectId: parsedArgs.projectId ?? PROJECT_ID,
    apiKey: parsedArgs.apiKey ?? API_KEY
  };
}

/**
 * The type of object returned from yargs.parseSync().
 */
interface ParsedYargs {
  projectId?: string;
  apiKey?: string;
  prod?: boolean;
  emulator?: boolean;
  nightly?: boolean;
  qa?: boolean;
  quiet?: boolean;
  debug?: boolean;
}

/**
 * Verifies that at most one of the given arguments are set in the given object.
 *
 * @param argNames the names of the arguments to check.
 * @return a function suitable for specifying to yargs.check() to verify the
 * mutual exclusivity of the given arguments.
 */
function checkMutuallyExclusive(
  ...argNames: Array<keyof ParsedYargs>
): (argv: ParsedYargs) => true {
  return (argv: ParsedYargs): true => {
    const setArgNames = argNames.filter(argName => argv[argName] !== undefined);
    if (setArgNames.length > 1) {
      throw new Error(
        `at most one of ${argNames.join(', ')} may be set, ` +
          `but got: ${setArgNames.join(', ')}`
      );
    }
    return true;
  };
}

/**
 * Parses and returns the "host" from the given parsed arguments.
 */
function hostFromParsedArgs(parsedArgs: ParsedYargs): FirestoreHost {
  if (parsedArgs.prod) {
    return 'prod';
  }
  if (parsedArgs.emulator) {
    return 'emulator';
  }
  if (parsedArgs.nightly) {
    return 'nightly';
  }
  if (parsedArgs.qa) {
    return 'qa';
  }
  return HOST;
}
