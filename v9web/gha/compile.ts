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

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

// @ts-ignore
import { default as nunjucks } from 'nunjucks';
// @ts-ignore
import yargs from 'yargs/yargs';

const __filename = path.relative('.', url.fileURLToPath(import.meta.url));
const __dirname = path.dirname(__filename);

const srcFileName = 'v9web.yml.njk';
const srcFile = path.normalize(`${__dirname}/${srcFileName}`);
const defaultDestFile = path.normalize(
  `${__dirname}/../../.github/workflows/v9web.yml`
);

const parsedArgs = yargs(process.argv.slice(2))
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

const env = nunjucks.configure(__dirname, {
  autoescape: false,
  tags: {
    variableStart: '<$',
    variableEnd: '$>'
  },
  throwOnUndefined: true
});

const destFile = parsedArgs.outputFile ?? defaultDestFile;
console.log(`Creating ${destFile} from ${srcFile}`);
console.log(`Loading ${srcFile}`);
const template = env.getTemplate(srcFileName, false);
console.log(`Rendering ${srcFile}`);
const renderedTemplate = template.render({ srcFile });
console.log(`Writing rendered template to ${destFile}`);
fs.writeFileSync(destFile, renderedTemplate);
console.log(`Successfully created ${destFile} from ${srcFile}`);
