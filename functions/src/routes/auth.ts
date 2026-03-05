import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Defines what s sign-up request must look like
interface SignupData {
    displayName: string;
    email: string;
    password: string;
}

// Defines the login requirements
interface LoginData {
    uid: string;
}

// Sign-up: Creating a new user

// Defines a callable function (triggered by onCall)
export const signup = onCall<SignupData>(async (request) => {
    // pulls specific fields out of the SignupData object for use by the server
    const { displayName, email, password } = request.data;

    // Validation check; Stops bad data
    if (!email || !password || password.length < 6) {
        throw new HttpsError(
            "invalid-argument",
            "Password must be at least 6 characters.",
        );
    }

    try {
        // Instructs the firebase auth system to generate a new entry in the "Users" list
        const user = await admin.auth().createUser({ displayName, email, password });

        // creates a user document in Firestore when new users sign up
        await admin.firestore().collection("users").doc(user.uid).set({
            // Create or override document with this data
            username: user.displayName,
            email: user.email, // user email from auth
            createdAt: new Date().toISOString(), // current server time
            role: "user", // default role
        });

        const token = await admin.auth().createCustomToken(user.uid);

        // returns the uid and email if successfull
        return {
            displayName: user.displayName,
            uid: user.uid,
            email: user.email,
            token
            // verificationLink: link
        };
    } catch (error: any) {
        console.log("Full error log: ", error.message);
        // Specific error mapping
        if (error.code == "auth/email-already-exists") {
            throw new HttpsError("already-exists", "Email is already registered.");
        }

        throw new HttpsError(
            "internal",
            `Something went wrong, ERROR: ${error.message}`,
        );
    }
});

// Login: login an existing user

export const login = onCall<LoginData>(async (request) => {
    // Pull field from LoginData object (data extraction)

    const token = request.auth?.token;

    if (!token) {
        throw new HttpsError(
            "unauthenticated",
            "User must be logged in."
        );
    }

    const uid = token.uid;
    const email = token.email;

    try {
        // Fetch user profile from Firestore
        const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .get();

        // Check if user exists in the database
        if (!userDoc.exists) {
            throw new HttpsError("not-found", "User profile not found.");
        }

        const userData = userDoc.data();
        const lastLogin = new Date().toISOString();

        await admin.firestore().collection("users").doc(uid).update({lastLogin})

        // return the profile data
        return {
            uid,
            email,
            role: userData?.role,
            lastLogin,
        };
    } catch (error: any) {
        throw new HttpsError("internal", `Login failed: ${error.message}`);
    }
});
