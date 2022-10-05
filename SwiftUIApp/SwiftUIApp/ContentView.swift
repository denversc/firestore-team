//
//  ContentView.swift
//  SwiftUIApp
//

import SwiftUI
import FirebaseCore
import FirebaseFirestore
import FirebaseFirestoreSwift
import FirebaseAuth

struct ContentView: View {
    var body: some View {
        Text("Hello, world!")
            .padding()
        Button {
          async {
            try? await signIn()
          }
        } label: {
           Text("Sign in")
        }
        Button {
          async {
            try? await loadData()
          }
        } label: {
           Text("Load Data")
        }
    }
    
    @MainActor
    func signIn() async {
      do {
          // TODO: replace "email" and "password" with the account in Auth
        let authDataResult = try await Auth.auth().signIn(withEmail: "email", password: "password")
        let user = authDataResult.user
        
        print("Signed in as user \(user.uid), with email: \(user.email ?? "")")
      }
      catch {
        print("There was an issue when trying to sign in: \(error)")
      }
    }
    
    func loadData() async {
        do {
            try await loadConfigAndUser()
        } catch _ {
            print("error")
        }
    }
    
    @MainActor
        func loadConfigAndUser() async throws {
            // try await Task.sleep(seconds: 1.5) - SOLVED THE PROBLEM

            for doc in try await self.getUser() {
                print(doc.data())
            }
            
        }
    
    func getUser() async throws -> [QueryDocumentSnapshot] {
        let doc = try await Firestore.firestore().collection("towns").getDocuments()
        
        return doc.documents
        }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
