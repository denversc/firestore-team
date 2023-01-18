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

import { initializeApp, FirebaseApp } from '@firebase/app';
import {
  connectFirestoreEmulator,
  Firestore,
  getFirestore,
  initializeFirestore,
  setLogLevel
} from '@firebase/firestore';

import { Md5 } from 'ts-closure-library/lib/crypt/md5';

import {
  API_KEY,
  FirestoreHost,
  HOST,
  hostNameFromHost,
  isPlaceholderValue,
  PlaceholderProjectIdNotAllowedError,
  PROJECT_ID,
  UnknownFirestoreHostError
} from './firebase_config.js';
import { runTheTest } from './run_the_test.js';
import { CancellationTokenSource } from './cancellation_token.js';
import { log, resetStartTime, setLogFunction } from './logging.js';
import { clearLogs, log as browserLog } from './logging_browser.js';
import { formatElapsedTime } from './util.js';

// Initialize the logging framework.
setLogFunction(browserLog);

class FirebaseObjectCache<T> {
  private readonly cachedObjectsByKey = new Map<string, T>();

  get(host: string, projectId: string, apiKey: string): T | null {
    const key = FirebaseObjectCache.key(host, projectId, apiKey);
    return this.cachedObjectsByKey.get(key) ?? null;
  }

  set(host: string, projectId: string, apiKey: string, object: T): void {
    const key = FirebaseObjectCache.key(host, projectId, apiKey);
    if (this.cachedObjectsByKey.has(key)) {
      throw new Error(
        `Entry for host=${host} projectId=${projectId} apiKey=${apiKey} already exists`
      );
    }
    this.cachedObjectsByKey.set(key, object);
  }

  private static key(host: string, projectId: string, apiKey: string): string {
    return `${host}%${projectId}%${apiKey}`;
  }
}

function generateFirebaseAppName(
  host: string,
  projectId: string,
  apiKey: string
): string {
  const encoder = new TextEncoder();
  const encodedValue = encoder.encode(`${host}%${projectId}%${apiKey}`);
  const md5 = new Md5();
  md5.update(encodedValue);
  const digest = md5
    .digest()
    .map(n => String.fromCharCode(n))
    .join('');
  return btoa(digest);
}

const firebaseAppCache = new FirebaseObjectCache<FirebaseApp>();
const firestoreInstanceCache = new FirebaseObjectCache<Firestore>();

/**
 * Create the `Firestore` object and return it.
 */
function setupFirestore(): Firestore {
  const appSettings = AppSettings.load();

  // Set the requested debug log level before doing anything else.
  if (!appSettings.debugLogEnabled.isApplied) {
    appSettings.debugLogEnabled.apply();
  }

  const host = appSettings.host.value;
  const hostName = appSettings.host.hostName;
  const hostDisplayName = appSettings.host.displayValue;
  const projectId = appSettings.projectId.value;
  const apiKey = appSettings.apiKey.value;

  // Verify that the Project ID is set to something other than the default if
  // the Firestore emulator is not being used. The default Project ID works with
  // the emulator, but will cause strange errors if used against prod.
  if (host !== 'emulator' && isPlaceholderValue(projectId)) {
    throw new PlaceholderProjectIdNotAllowedError(
      'The Project ID needs to be set in firebase_config.ts, or in the ' +
        'Settings, unless using the Firestore emulator.'
    );
  }

  // Use a previously-cached Firestore instance, if available.
  const cachedDb = firestoreInstanceCache.get(host, projectId, apiKey);
  if (cachedDb !== null) {
    log(
      `Using existing Firestore instance with host ${hostDisplayName} and Project ID ${projectId}`
    );
    return cachedDb;
  }

  const cachedApp = firebaseAppCache.get(host, projectId, apiKey);
  let app: FirebaseApp;
  if (cachedApp !== null) {
    log(`Using existing FirebaseApp instance with Project ID ${projectId}`);
    app = cachedApp;
  } else {
    log(`initializeApp(${isPlaceholderValue(projectId) ? '' : projectId})`);
    const appName = generateFirebaseAppName(host, projectId, apiKey);
    app = initializeApp({ projectId, apiKey }, appName);
    firebaseAppCache.set(host, projectId, apiKey, app);
  }

  let db: Firestore;
  if (host === 'prod') {
    log(`getFirestore() for host ${hostDisplayName} (${host})`);
    db = getFirestore(app);
  } else if (host === 'emulator') {
    log('getFirestore()');
    db = getFirestore(app);
  } else {
    log(`initializeFirestore(app, { host: ${hostName} (${host}) }`);
    db = initializeFirestore(app, { host: hostName });
  }

  if (host === 'emulator') {
    log(`connectFirestoreEmulator(db, ${hostName}, 8080)`);
    connectFirestoreEmulator(db, hostName, 8080);
  }

  firestoreInstanceCache.set(host, projectId, apiKey, db);
  return db;
}

let currentCancellationTokenSource: CancellationTokenSource | null = null;

/**
 * Callback invoked whenever the "Enable Debug Logging" checkbox's checked state
 * changes.
 *
 * Sets up the `Firestore` instance and invoke the `runTheTest()` function from
 * `run_the_test.ts`.
 */
async function go(this: GlobalEventHandlers, ev: MouseEvent) {
  const { btnRunTest, btnCancelTest } = getUiElements();
  const startTime: DOMHighResTimeStamp = performance.now();
  const title = (ev.currentTarget as HTMLElement).innerText;

  if (currentCancellationTokenSource) {
    currentCancellationTokenSource.cancel();
  }
  const cancellationTokenSource = new CancellationTokenSource();
  currentCancellationTokenSource = cancellationTokenSource;

  log(`"${title}" started`);
  try {
    btnRunTest.disabled = true;
    btnCancelTest.disabled = false;
    btnCancelTest.onclick = (ev: MouseEvent) => {
      log(`"${(ev.currentTarget as HTMLElement).innerText}" clicked`);
      cancellationTokenSource.cancel();
    };
    const db = setupFirestore();
    await runTheTest(db, cancellationTokenSource.cancellationToken);
  } catch (e) {
    if (e instanceof Error) {
      log(`ERROR: ${e.message}`, { alsoLogToConsole: false });
      console.log(e.stack);
    } else {
      log(`ERROR: ${e}`);
    }
  } finally {
    btnRunTest.disabled = false;
  }
  const endTime: DOMHighResTimeStamp = performance.now();
  const elapsedTimeStr = formatElapsedTime(startTime, endTime);
  log(`"${title}" completed in ${elapsedTimeStr}`);
}

/**
 * Clears the logs from the UI and resets the log time back to zero.
 */
function clearLogsAndResetStartTime(): void {
  clearLogs();
  resetStartTime();
}

class UnsupportedAppSettingValueTypeError extends Error {
  name = 'UnsupportedAppSettingValueTypeError';
}

/**
 * The type-erased base class of `AppSettingValue`.
 */
interface AppSettingValueBase {
  /** A human-friendly name for this setting to display in a UI. */
  readonly name: string;

  /** The key by which this setting's value is saved in persistent storage. */
  readonly key: string;

  /** A human-friendly version of this setting's value to display in a UI. */
  readonly displayValue: string;

  /**
   * Whether the value of this setting has been changed and not yet saved to
   * persistent storage.
   */
  readonly isDirty: boolean;

  /**
   * Whether the value of this setting has not yet been set, and its value is
   * simply the default.
   */
  readonly isDefault: boolean;

  /**
   * Whether this setting has even been "applied" by calling `apply()`.
   *
   * If this setting does not define `apply()` then this attribute value is
   * always `false`.
   */
  readonly isApplied: boolean;

  /**
   * Loads the value of this setting from persistent storage.
   */
  load(): void;

  /**
   * Saves the value of this setting to persistent storage.
   *
   * The value of this setting will be written even if it has not changed or is
   * using the default value. To avoid a write operation in this scenario, only
   * call this method if `dirty` is `true`.
   *
   * This method does _not_ call `apply()`. In general, the caller of `save()`
   * should also call `apply()`.
   */
  save(): void;

  /**
   * Apply this setting's value so that it takes effect.
   *
   * For example, if this setting controls debug logging, then this method
   * should toggle debug logging based on this setting's current value.
   *
   * This is an optional method, and only needs to be implemented for settings
   * that need to take some action to have effect.
   */
  apply?(): void;
}

const RESET_TOKEN = Symbol('RESET_TOKEN');

class AppSettingValue<T extends string | boolean>
  implements AppSettingValueBase
{
  private _setValue: T | typeof RESET_TOKEN | null = null;
  private _loadedValue: T | null = null;

  constructor(
    readonly name: string,
    readonly key: string,
    readonly defaultValue: T
  ) {}

  get value(): T {
    if (this._setValue === RESET_TOKEN) {
      return this.defaultValue;
    }
    if (this._setValue !== null) {
      return this._setValue;
    }
    if (this._loadedValue !== null) {
      return this._loadedValue;
    }
    return this.defaultValue;
  }

  get displayValue(): string {
    return `${this.value}`;
  }

  get isDirty(): boolean {
    return this._setValue !== null;
  }

  get isDefault(): boolean {
    return this._setValue === null && this._loadedValue === null;
  }

  get isApplied(): boolean {
    // Subclasses that provide an `apply()` function must override this property
    // to return the correct value.
    return false;
  }

  setValue(newValue: T): void {
    this._setValue = newValue;
  }

  resetValue(): void {
    this._setValue = RESET_TOKEN;
  }

  load(): void {
    const loadedValue = this._loadValue();
    if (loadedValue !== null) {
      this._loadedValue = loadedValue;
    }
  }

  private _loadValue(): T | null {
    const stringValue = window?.sessionStorage?.getItem(this.key) ?? null;
    if (stringValue === null) {
      return null;
    }

    if (typeof this.defaultValue === 'string') {
      return stringValue as T;
    }

    if (typeof this.defaultValue === 'boolean') {
      if (stringValue === 'true') {
        return true as T;
      } else if (stringValue === 'false') {
        return false as T;
      } else {
        return null;
      }
    }

    throw new Error(
      `internal error: unexpected typeof this.defaultValue: ` +
        `${typeof this.defaultValue}`
    );
  }

  save(): void {
    const newValue = this._setValue;
    if (newValue === null) {
      return;
    }
    this._setValue = null;

    if (newValue === RESET_TOKEN) {
      this._loadedValue = null;
    } else {
      this._loadedValue = newValue;
    }

    this._saveValue(newValue);
  }

  private _saveValue(value: T | typeof RESET_TOKEN): void {
    if (value === RESET_TOKEN) {
      window?.sessionStorage?.removeItem(this.key);
      return;
    }

    let valueString: string;
    if (typeof value === 'string') {
      valueString = value;
    } else if (typeof value === 'boolean') {
      valueString = value ? 'true' : 'false';
    } else {
      throw new Error(
        `internal error: unexpected typeof value: ` + `${typeof value}`
      );
    }

    window?.sessionStorage?.setItem(this.key, valueString);
  }
}

/**
 * A specialization of `AppSettingValue` where the value is a "host ID" of the
 * Firestore backend to which to connect.
 */
class FirestoreHostAppSettingValue extends AppSettingValue<FirestoreHost> {
  get displayValue(): string {
    return FirestoreHostAppSettingValue.displayValueFromHostId(this.value);
  }

  get hostName(): string {
    return FirestoreHostAppSettingValue.hostNameFromHostId(this.value);
  }

  static hostNameFromHostId(hostId: FirestoreHost): string {
    return hostNameFromHost(hostId);
  }

  static displayValueFromHostId(hostId: FirestoreHost): string {
    const label = this.displayLabelFromHostId(hostId);
    const hostName = this.hostNameFromHostId(hostId);
    return `${label} (${hostName})`;
  }

  static displayLabelFromHostId(hostId: FirestoreHost): string {
    switch (hostId) {
      case 'prod':
        return 'Production';
      case 'emulator':
        return 'Emulator';
      case 'nightly':
        return 'Nightly';
      case 'qa':
        return 'QA';
    }
    throw new UnknownFirestoreHostError(hostId);
  }
}

let debugLogEnabledSettingApplied = false;

/**
 * A specialization of `AppSettingValue` where the value is whether Firestore's
 * debug logging is enabled.
 */
class FirestoreDebugLogEnabledAppSettingValue extends AppSettingValue<boolean> {
  get isApplied(): boolean {
    return debugLogEnabledSettingApplied;
  }

  apply(): void {
    debugLogEnabledSettingApplied = true;

    if (this.isDefault) {
      return;
    }

    const newLogLevel = this.value ? 'debug' : 'info';
    log(`setLogLevel(${newLogLevel})`);
    setLogLevel(newLogLevel);
  }
}

/**
 * This application's settings.
 */
class AppSettings {
  readonly debugLogEnabled = new FirestoreDebugLogEnabledAppSettingValue(
    'Firestore debug logging',
    'debugLogEnabled',
    false
  );
  readonly host = new FirestoreHostAppSettingValue(
    'Firestore host',
    'host',
    HOST
  );
  readonly projectId = new AppSettingValue<string>(
    'Firebase Project ID',
    'projectId',
    PROJECT_ID
  );
  readonly apiKey = new AppSettingValue<string>(
    'Firebase API key',
    'apiKey',
    API_KEY
  );

  private constructor() {}

  get all(): Array<AppSettingValueBase> {
    return [this.debugLogEnabled, this.host, this.projectId, this.apiKey];
  }

  saveAll(): Array<AppSettingValueBase> {
    const savedSettings: Array<AppSettingValueBase> = [];
    for (const setting of this.all) {
      if (setting.isDirty) {
        setting.save();
        setting.apply?.();
        savedSettings.push(setting);
      }
    }
    return savedSettings;
  }

  loadAll(): void {
    for (const setting of this.all) {
      setting.load();
    }
  }

  static load(): AppSettings {
    const appSettings = new AppSettings();
    appSettings.loadAll();
    return appSettings;
  }
}

// The HTML elements in the UI with which this script interacts.
interface UiElements {
  btnRunTest: HTMLButtonElement;
  btnCancelTest: HTMLButtonElement;
  btnClearLogs: HTMLButtonElement;
  btnSettings: HTMLButtonElement;
  btnSettingsSave: HTMLButtonElement;
  btnSettingsCancel: HTMLButtonElement;
  chkDebugLogging: HTMLInputElement;
  radFirestoreHostProd: HTMLInputElement;
  radFirestoreHostEmulator: HTMLInputElement;
  radFirestoreHostNightly: HTMLInputElement;
  radFirestoreHostQA: HTMLInputElement;
  txtProjectId: HTMLInputElement;
  txtApiKey: HTMLInputElement;
  divMain: HTMLDivElement;
  divSettings: HTMLDivElement;
}

/** Returns the HTML elements from the UI with which this script interacts. */
function getUiElements(): UiElements {
  return {
    btnRunTest: document.getElementById('btnRunTest') as HTMLButtonElement,
    btnCancelTest: document.getElementById(
      'btnCancelTest'
    ) as HTMLButtonElement,
    btnClearLogs: document.getElementById('btnClearLogs') as HTMLButtonElement,
    btnSettings: document.getElementById('btnSettings') as HTMLButtonElement,
    btnSettingsSave: document.getElementById(
      'btnSettingsSave'
    ) as HTMLButtonElement,
    btnSettingsCancel: document.getElementById(
      'btnSettingsCancel'
    ) as HTMLButtonElement,
    chkDebugLogging: document.getElementById(
      'chkDebugLogging'
    ) as HTMLInputElement,
    radFirestoreHostProd: document.getElementById(
      'radFirestoreHostProd'
    ) as HTMLInputElement,
    radFirestoreHostEmulator: document.getElementById(
      'radFirestoreHostEmulator'
    ) as HTMLInputElement,
    radFirestoreHostNightly: document.getElementById(
      'radFirestoreHostNightly'
    ) as HTMLInputElement,
    radFirestoreHostQA: document.getElementById(
      'radFirestoreHostQA'
    ) as HTMLInputElement,
    txtProjectId: document.getElementById('txtProjectId') as HTMLInputElement,
    txtApiKey: document.getElementById('txtApiKey') as HTMLInputElement,
    divMain: document.getElementById('divMain') as HTMLDivElement,
    divSettings: document.getElementById('divSettings') as HTMLDivElement
  };
}

class AppSettingsUi {
  initialize(): void {
    const ui = getUiElements();
    const appSettings = AppSettings.load();

    // Wire up the checkbox for the "debug logging enabled" setting.
    ui.chkDebugLogging.checked = appSettings.debugLogEnabled.value;
    ui.chkDebugLogging.onclick = () => {
      appSettings.debugLogEnabled.setValue(ui.chkDebugLogging.checked);
    };

    // Wire up the radio options for the "Firestore host" setting.
    ui.radFirestoreHostProd.onclick = () => {
      appSettings.host.setValue('prod');
    };
    ui.radFirestoreHostEmulator.onclick = () => {
      appSettings.host.setValue('emulator');
    };
    ui.radFirestoreHostNightly.onclick = () => {
      appSettings.host.setValue('nightly');
    };
    ui.radFirestoreHostQA.onclick = () => {
      appSettings.host.setValue('qa');
    };
    switch (appSettings.host.value) {
      case 'prod':
        ui.radFirestoreHostProd.checked = true;
        break;
      case 'emulator':
        ui.radFirestoreHostEmulator.checked = true;
        break;
      case 'nightly':
        ui.radFirestoreHostNightly.checked = true;
        break;
      case 'qa':
        ui.radFirestoreHostQA.checked = true;
        break;
    }

    // Wire up the Project ID and API Key text boxes.
    AppSettingsUi._configureTextInputOnChange(
      ui.txtProjectId,
      appSettings.projectId
    );
    AppSettingsUi._configureTextInputOnChange(ui.txtApiKey, appSettings.apiKey);

    ui.btnSettingsSave.onclick = () => {
      this._onSaveClick(ui, appSettings);
    };
    ui.btnSettingsCancel.onclick = () => {
      this._close(ui);
    };

    window.location.hash = '#settings';
  }

  private _close(ui: UiElements): void {
    ui.chkDebugLogging.onclick = null;
    ui.radFirestoreHostProd.onclick = null;
    ui.radFirestoreHostEmulator.onclick = null;
    ui.radFirestoreHostNightly.onclick = null;
    ui.radFirestoreHostQA.onclick = null;
    ui.btnSettingsSave.onclick = null;
    ui.btnSettingsCancel.onclick = null;
    ui.txtProjectId.onchange = null;
    ui.txtApiKey.onchange = null;

    window.location.hash = '';
  }

  private static _configureTextInputOnChange(
    htmlElement: HTMLInputElement,
    setting: AppSettingValue<string>
  ): void {
    const initialText = setting.value;
    htmlElement.value = isPlaceholderValue(initialText) ? '' : initialText;
    htmlElement.onchange = () => {
      const text = htmlElement.value ?? '';
      if (text.trim().length === 0) {
        setting.resetValue();
      } else {
        setting.setValue(text);
      }
    };
  }

  private _onSaveClick(ui: UiElements, appSettings: AppSettings): void {
    const savedSettings = appSettings.saveAll();
    if (savedSettings.length === 0) {
      log('No settings changed');
    } else {
      for (const savedSetting of savedSettings) {
        const defaultValueSuffix = savedSetting.isDefault
          ? ' (the default)'
          : '';
        log(
          `${savedSetting.name} changed to ${savedSetting.displayValue}${defaultValueSuffix}`
        );
      }
    }

    this._close(ui);
  }
}

/**
 * Replaces static text in the HTML DOM with the dynamic text calculated at
 * runtime.
 *
 * This function searches through the DOM for all "span" nodes with the
 * "data-dynamic-replace" attribute. The text of the nodes is used as the "key"
 * and will be replaced with the corresponding value.
 */
function initializeDynamicReplaceSpanTexts(): void {
  const spanNodes = document.getElementsByTagName('span');
  for (const spanNode of spanNodes) {
    if (spanNode.hasAttribute('data-dynamic-replace')) {
      const key = spanNode.getAttribute('data-dynamic-replace');
      if (key === null) {
        console.warn(
          `'data-dynamic-replace' attribute of 'span' node requires a value`
        );
        continue;
      }

      const replacementText = spanTextFromDynamicReplaceKey(key);
      if (replacementText === null) {
        console.warn(
          `'data-dynamic-replace' attribute of 'span' is not known: ${key}`
        );
        continue;
      }

      spanNode.textContent = replacementText;
    }
  }
}

/**
 * Gets the replacement text for a "span" node with the "data-dynamic-replace"
 * attribute set to the given key.
 *
 * @param key the value of the span node's "data-dynamic-replace" attribute,
 * whose corresponding value to look up.
 *
 * @return the replacement text for a span node whose "data-dynamic-replace"
 * attribute is set to the given value, or `null` if the given value is not
 * known.
 */
function spanTextFromDynamicReplaceKey(key: string): string | null {
  switch (key) {
    case 'HOST_NAME_PROD':
      return FirestoreHostAppSettingValue.hostNameFromHostId('prod');
    case 'HOST_NAME_EMULATOR':
      return FirestoreHostAppSettingValue.hostNameFromHostId('emulator');
    case 'HOST_NAME_NIGHTLY':
      return FirestoreHostAppSettingValue.hostNameFromHostId('nightly');
    case 'HOST_NAME_QA':
      return FirestoreHostAppSettingValue.hostNameFromHostId('qa');
    case 'HOST_LABEL_PROD':
      return FirestoreHostAppSettingValue.displayLabelFromHostId('prod');
    case 'HOST_LABEL_EMULATOR':
      return FirestoreHostAppSettingValue.displayLabelFromHostId('emulator');
    case 'HOST_LABEL_NIGHTLY':
      return FirestoreHostAppSettingValue.displayLabelFromHostId('nightly');
    case 'HOST_LABEL_QA':
      return FirestoreHostAppSettingValue.displayLabelFromHostId('qa');
    default:
      return null;
  }
}

function handleHashChange(): void {
  const { divMain, divSettings } = getUiElements();
  const isSettings = window.location.hash === '#settings';

  if (isSettings) {
    const appSettingsUi = new AppSettingsUi();
    appSettingsUi.initialize();
  }

  divMain.hidden = isSettings;
  divSettings.hidden = !isSettings;
}

/** Registers callbacks and initializes state of the HTML UI. */
function initializeUi(): void {
  initializeDynamicReplaceSpanTexts();

  const { btnRunTest, btnCancelTest, btnClearLogs, btnSettings } =
    getUiElements();

  btnRunTest.onclick = go;
  btnCancelTest.disabled = true;
  btnClearLogs.onclick = clearLogsAndResetStartTime;
  btnSettings.onclick = () => {
    window.location.hash = '#settings';
  };

  window.onhashchange = handleHashChange;
  handleHashChange();
}

// Call initializeUi() to get everything wired up.
initializeUi();
