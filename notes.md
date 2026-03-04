# Firebase functions cloud library
    - allows you to create and manage cloud functions that respond to Firebase events and HTTPS requests

# Firebase Admin SDK
    - has priviledged access to Firebase services
    - allows for interaction with firebase services such as firestore and authentication

# Callable functions (onCall)
    - creates a secure endpoint we can talk to
    - automatically handle things like authentication tokens and serializing data into JSON

# admin.Firestore()
    - gets the firestore database instnace through the Admin SDK

# .collection("users")
    - references the "users" collection in firestore

# .doc(user.uid)
    - creates a document with ID equal to the user's ID    