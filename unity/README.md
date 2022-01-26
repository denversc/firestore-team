# Firestore Unity Repro App

This app is a skeleton showing a very basic usage of Firestore in a Unity app.

The app's UI has a "Run Test" button and a "text field" for showing log
messages. To execute the Firestore code, press the "Run Test" button.

To run some different Firestore code, replace the body of the
`RunFirestoreTest()` method in `Assets/MainScript.cs` file.

## Setup Instructions

1. Copy `google-services.json` and `GoogleService-Info.plist` into the `Assets`
   directory.
1. Launch the Unity Hub application.
1. Click "Open" and select the `unity` directory.
1. If a warning dialog about "Non-matching Editor versions" appears, just click
   "Continue" to upgrade the project's files.
1. If prompted to enter "Safe Mode" due to compilation errors, click "Ignore"
   (the compilation errors will be fixed after importing the Firestore SDK).
1. Double-click `MainScene` to open it.
1. Unzip the Unity SDK into a temporary directory.
1. In the Unity Editor: Assets -> Import Package -> Custom Package.
1. Select `FirebaseFirestore.unitypackage` from the unzipped Unity SDK; choose
   the file from the `dotnet3` subdirectory for older Unity Editor versions
   (e.g. 2017) or the one from the `dotnet4` subdirectory for newer Unity Editor
   versions (e.g. 2020).
1. Click "Import" when the "Import Unitiy Package" dialog displays, which lists
   a bunch of files with checkboxes beside them.

## Running in the Unity Editor

Just press the "Play" button at the top of the screen to run the test app.
You can switch to the "Console" pane at the bottom to see the logged output.

On macOS, you may see a warning dialog that says "FirebaseCppApp-8_7_0.bundle
cannot be opened because the developer cannot be verified." If you see this then
do the following:

1. Click "Cancel" a bunch of times until the dialog finally goes away.
1. Open the mac "System Preferences" -> "Security & Privacy" and click the
   "Allow Anyway" button.
1. Press the "Play" button twice in the Unity Editor (the first click stops the
   app and the second restarts it).
1. Click the "Run Test" button in the Unity app.
1. A similar warning dialog will display, but this time there is an "Open"
   button; click it.

It should work just fine now.

## Running in Android

To run the app on an Android device or emulator, follow these steps.

1. In the Unity Editor, go to File -> Build Settings.
1. Click "Add Open Scenes".
1. Click "Android" in the "Platforms" list.
1. Click "Switch Platform".
1. If prompted to select a valid Bundle ID, then choose one.
1. If prompted to enable Android auto-resolution, click "Enable".
1. Wait for a couple of minutes which the Android dependencies are downloaded.
1. Click the "Player Settings" button in the "Build Settings" dialog.
1. In the "Publishing Settings" section, select "Proguard" for both "Release"
   and "Debug" under the "Minify" heading in older versions of Unity (e.g. Unity
   2017) or checkmark "Release" and "Debug" under the "Minify" heading in newer
   versionf of Unity (e.g. Unity 2020).
1. In the "Other Settings" section, change the "Minimum API Level" to 26 or
   greater.
1. If using Unity 2017 or 2018, follow the "Java 8 support and desugaring"
   instructions at https://firebase.google.com/docs/unity/troubleshooting-faq
   to modify the Gradle build file to work around a limitation.
1. Launch the Android emulator.
1. Click the "Build And Run" button in the "Build Settings" dialog.
1. If prompted with a file dialog, specify a file name for the generated APK
   file (e.g. "app.apk").
1. Wait for the build; it could take 2-5 minutes.
1. The app should launch on the connected Android device/emulator.

## Running in iOS

To run the app on an iOS device or simulator, follow these steps.

1. In the Unity Editor, go to File -> Build Settings.
1. Click "Add Open Scenes".
1. Click "iOS" in the "Platforms" list.
1. Click "Switch Platform".
1. If prompted to select a valid Bundle ID, then choose one.
1. Click the "Player Settings" button in the "Build Settings" dialog.
1. In "Other Settings" set "Target SDK" to "Device SDK" to run the app on a real
   device (the default) or "Simulator SDK" to run on a simulator.
1. Click the "Build And Run" button in the "Build Settings" dialog.
1. If prompted with a file dialog, specify a directory name for the generated
   Xcode project (e.g "build-ios").
1. When Xcode launches, press the "Play" button.
1. The app should launch on the connected iOS device/emulator.
