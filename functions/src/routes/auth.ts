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

