import nodemailer from "nodemailer";
const testAccount = await nodemailer.createTestAccount();
console.log(testAccount);