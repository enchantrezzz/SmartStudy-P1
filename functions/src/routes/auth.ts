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
    email: string;
    password: string;
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
    const { email, password } = request.data;

    if (!email || !password) {
        throw new HttpsError(
            "invalid-argument", 
            "Email and password are required");
    }

    try {

        // Retrieve API key from .env
        const apiKey = process.env.APP_API_KEY;

        // Added the REST API call - verifies password and returns the uid and token
        const authRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "applications/json" },
                body: JSON.stringify({
                    email,
                    password,
                    returnSecureToken: true
                })
            }
        );

        if (!authRes.ok) {
            const err = await authRes.json();
            const errorCode = err.error?.message;

            // Error mapping
            if (errorCode === "EMAIL_NOT_FOUND" || errorCode === "INVALID_PASSWORD") {
                throw new HttpsError(
                    "unauthenticated",
                    "Invalid email or password.");
            }

            if (errorCode === "USER_DISABLED") {
                throw new HttpsError(
                    "permission-denied", 
                    "This account has been disabled.");
            }

            throw new HttpsError(
                "unauthenticated", 
                "Authentication failed.");

        }

        const authData = await authRes.json(); // Read the body stream and parses from JSON to TS object
        const uid = authData.localId;
        const idToken = authData.idToken;

        // Fetch user profile from Firestore
        const userDoc = await admin
            .firestore()
            .collection("users")
            .doc(uid)
            .get();

        // Check if user exists in the database
        if (!userDoc.exists) {
            throw new HttpsError(
                "not-found", 
                "User profile not found.");
        }

        const userData = userDoc.data();
        const lastLogin = new Date().toISOString();

        await admin.firestore().collection("users").doc(uid).update({ lastLogin });

        // return the profile data
        return {
            uid,
            email: userData?.email,
            role: userData?.role,
            idToken,
            lastLogin,
        };

    } catch (error: any) {
        throw new HttpsError(
            "internal", 
            `Login failed: ${error.message}`);
    }
});
