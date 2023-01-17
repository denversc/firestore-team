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

// This script generates the GitHub Actions definition for the "v9web"
// directory, v9web.yml, using the nunjucks templating engine and the template
// `v9web.yml.njk` defined in this directory.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

// @ts-ignore
import { default as nunjucks } from 'nunjucks';
// @ts-ignore
import yargs from 'yargs/yargs';

// Define __filename and __dirname manually; they are automatically available
// when building commonjs modules, but since we're using es modules we have to
// define them explicitly (https://nodejs.org/api/modules.html#__dirname).
const __filename = path.relative('.', url.fileURLToPath(import.meta.url));
const __dirname = path.dirname(__filename);

const srcFileName = 'v9web.yml.njk';
const srcFile = path.normalize(`${__dirname}/${srcFileName}`);
const defaultDestFile = path.normalize(
  `${__dirname}/../../.github/workflows/v9web.yml`
);

// Parse the command-line arguments using yargs.
interface ParsedYargs {
  outputFile?: string;
}
const parsedArgs: ParsedYargs = yargs(process.argv.slice(2))
  .strict()
  .options({
    outputFile: {
      alias: 'o',
      type: 'string',
      describe: `The file to which to write (default: ${defaultDestFile}).`
    }
  })
  .help()
  .parseSync();

// Initialize nunjucks.
const env = nunjucks.configure(__dirname, {
  // Disable `autoescape` since it's only relevant when generating HTML.
  autoescape: false,
  // Change `variableStart` and `variableEnd` from '{{' and '}}' to '<%' and
  // '%>' because '{{' and '}}' are used in GitHub Actions YAML files to use
  // "expressions"
  // (https://docs.github.com/en/actions/learn-github-actions/expressions)
  tags: {
    variableStart: '<$',
    variableEnd: '$>'
  },
  // Fail loudly when undefined variables are used, for robustness.
  throwOnUndefined: true
});

// Parse the template and generate the output using nunjucks.
const destFile = parsedArgs.outputFile ?? defaultDestFile;
console.log(`Creating ${destFile} from ${srcFile}`);
console.log(`Loading ${srcFile}`);
const template = env.getTemplate(srcFileName, false);
console.log(`Rendering ${srcFile}`);
const renderedTemplate = template.render({ srcFile });
console.log(`Writing rendered template to ${destFile}`);
fs.writeFileSync(destFile, renderedTemplate);
console.log(`Successfully created ${destFile} from ${srcFile}`);
