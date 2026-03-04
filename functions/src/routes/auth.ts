import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Defines what s sign-up request must look like
interface SignupData {
    email: string;
    password: string;
}

// Defines the login requirements
interface LoginData {
    uid: string;
}

// Sign-up: Creating a new user

// Defines a callable function (triggered by onCall)
export const signup = onCall<SignupData> (async (request) => {

    // pulls specific fields out of the SignupData object for use by the server
    const {email, password} = request.data;

    // Validation check; Stops bad data 
    if (!email || !password || password.length < 6) {
        throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
    }
    
    try {
        // Instructs the firebase auth system to generate a new entry in the "Users" list
        const user = await admin.auth().createUser({email, password});

        // creates a user document in Firestore when new users sign up
        await admin.firestore().collection("users").doc(user.uid).set({
            // Create or override document with this data
            email: user.email, // user email from auth
            createdAt: new Date().toISOString(), // current server time
            role: "user" // default role
        });

        // const redirect = {url: 'https://localhost:5000/login'};
        // const link = await admin.auth().generateEmailVerificationLink(email, redirect);

        // returns the uid and email if successfull
        return {
            uid: user.uid, 
            email:user.email, 
            // verificationLink: link
            };

    } catch (error: any) {

        console.log("Full error log: ", error.message);
        // Specific error mapping
        if (error.code == 'auth/email-already-exists'){
            throw new HttpsError("already-exists", "Email is already registered.");
        }

        throw new HttpsError("internal", `Something went wrong, ERROR: ${error.message}`);
    }
});

// Login: login an existing user 

export const login = onCall<LoginData> (async (request) => {

    // Authentication check
    // const authUser = request.auth; // contains the authenticated user's info (added automatically by firebase)

    // if (!authUser) {
       //  throw new functions.https.HttpsError("unauthenticated", "You must be logged in!");
        // Ensures only authenticated users can call this function
    // }

    // Pull field from LoginData object (data extraction)
    const {uid} = request.data;

    // Validation: check if a UID was provided
    if (!uid) {
        throw new HttpsError("invalid-argument", "User ID is required");
    }

    // if (authUser.uid !== uid) {
    //     throw new functions.https.HttpsError("permission-denied", "cannot access other user's profile");
    // }

    try {

        // Fetch user profile from Firestore 
        const userDoc = await admin.firestore().collection("users").doc(uid).get();

        // Check if user exists in the database
        if (!userDoc.exists) {
            throw new HttpsError("not-found", "User profile not found.");
        }

        const userData = userDoc.data();

        // return the profile data 
        return {
            uid: uid,
            email: userData?.email,
            role: userData?.role,
            lastLogin: new Date().toISOString()
        };
    } catch (error: any) {
        throw new HttpsError("internal", `Login failed: ${error.message}`);
    }
});