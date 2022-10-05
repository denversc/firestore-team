//
//  SwiftUIAppApp.swift
//  SwiftUIApp
//

import SwiftUI
import FirebaseCore

@main
struct RepoAppApp: App {
    init() {
           FirebaseApp.configure()
       }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
