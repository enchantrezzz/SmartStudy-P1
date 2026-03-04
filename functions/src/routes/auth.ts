import * as functions from "firebase-functions";
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
export const signup = functions.https.onCall<SignupData> (async (request) => {

    // pulls specific fields out of the SignupData object for use by the server
    const {email, password} = request.data;

    // Validation check; Stops bad data 
    if (!email || password.length < 6) {
        throw new functions.https.HttpsError("invalid-argument", "Password must be at least 6 characters.");
    }
    
    try {
        // Instructs the firebase auth system to generate a new entry in the "Users" list
        const user = await admin.auth().createUser({email, password});

        // creates a user document in Firestore when new users sign up
        await admin.firestore().collection("users").doc(user.uid).set({
            // Create or override document with this data
            email: user.email, // user email from auth
            createdAt: admin.firestore.FieldValue.serverTimestamp(), // current server time
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
        // Specific error mapping
        if (error.code == 'auth/email-already-exists'){
            throw new functions.https.HttpsError("already-exists", "Email is already registered.");
        }

        throw new functions.https.HttpsError("internal", "Something went wrong.");
    }
});
