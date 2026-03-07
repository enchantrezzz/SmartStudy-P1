// imports the firebase cloud functions library
// import * as functions from "firebase-functions";

// imports the Firebase Admin SDK
import * as admin from "firebase-admin";

import {signup, login, resetPass} from "../controllers/authController";

// initializes the Firebase Admin SDK with default credentials
admin.initializeApp();

// Export functions so firebase can use them
export const signupUser = signup;
export const loginUser = login;
export const resetUserPassword = resetPass;

