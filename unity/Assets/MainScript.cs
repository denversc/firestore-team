// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

using Firebase;
using Firebase.Extensions;
using Firebase.Firestore;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.UI;

public class MainScript : MonoBehaviour {

  public Text textField;

  private System.Random random = new System.Random();
  private FirebaseFirestore db;

  private IEnumerator RunFirestoreTest() {
    DocumentReference doc = db.Document("foo/bar");

    {
      Task<DocumentSnapshot> task = doc.GetSnapshotAsync();
      yield return WaitUntilTaskCompleted(task);
      if (task.IsFaulted) {
        LogError("Getting contents of document " + doc.Path + " failed: " + task.Exception);
        yield break;
      }

      DocumentSnapshot snapshot = task.Result;
      if (! snapshot.Exists) {
        Log("Document " + doc.Path + " does not exist.");
      } else if (! snapshot.ContainsField("data")) {
        Log("Document " + doc.Path + " exists, but its \"data\" field is not set.");
      } else {
        Log("Document " + doc.Path + " exists and its \"data\" field is set to: " + snapshot.GetValue<object>("data"));
      }
    }

    {
      var newValue = this.random.Next();
      Log("Document " + doc.Path + " \"data\" field is being set to: " + newValue);
      Task task = doc.SetAsync(new Dictionary<string, object> { { "data", newValue } });
      yield return WaitUntilTaskCompleted(task);
      if (task.IsFaulted) {
        LogError("Setting contents of document " + doc.Path + " failed: " + task.Exception);
        yield break;
      }
    }
  }

  public void Start() {
    Log("App started");
  }

  public void RunTest() {
    StartCoroutine(this.RunTestCo());
  }

  private IEnumerator RunTestCo() {
    if (db == null) {
      Log("Initializing Firebase");
      Task<Firebase.DependencyStatus> task = FirebaseApp.CheckAndFixDependenciesAsync();
      yield return WaitUntilTaskCompleted(task);
      if (task.IsFaulted) {
        LogError("CheckAndFixDependenciesAsync() failed: " + task.Exception);
        yield break;
      } else if (task.Result != Firebase.DependencyStatus.Available) {
        LogError("CheckAndFixDependenciesAsync() failed: " + task.Result);
        yield break;
      }

      // Uncomment this line to enable debug logging.
      FirebaseFirestore.LogLevel = LogLevel.Debug;

      try {
        db = FirebaseFirestore.DefaultInstance;
      } catch (Exception e) {
        LogError("FirebaseFirestore.DefaultInstance failed: " + e);
        yield break;
      }
    }

    StartCoroutine(this.RunFirestoreTest());
  }

  private void Log(string message) {
    AppendToTextField(message);
    Debug.Log("MainScript: " + message);
  }

  private void LogError(string message) {
    AppendToTextField("ERROR: " + message);
    Debug.LogError("MainScript: ERROR: " + message);
  }

  private void AppendToTextField(string text) {
    if (textField.text.Length > 0) {
      textField.text = textField.text + "\n" + text;
    } else {
      textField.text = text;
    }
  }

  private static WaitUntil WaitUntilTaskCompleted(Task task) {
    return new WaitUntil(() => task.IsCompleted);
  }

  private static WaitUntil WaitUntilTaskCompleted<T>(Task<T> task) {
    return new WaitUntil(() => task.IsCompleted);
  }

}
