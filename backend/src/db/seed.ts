import "dotenv/config";
import nodemailer from "nodemailer";
import { prisma } from "./client.js";

const SENDER_COUNT = 3;

async function main() {
    console.log(`Creating ${SENDER_COUNT} Ethereal senders...`);

    for (let i = 0; i < SENDER_COUNT; i++) {
        const testAccount = await nodemailer.createTestAccount();

        const sender = await prisma.sender.upsert({
            where: { email: testAccount.user },
            update: {
                smtpUser: testAccount.user,
                smtpPass: testAccount.pass,
            },
            create: {
                email: testAccount.user,
                smtpUser: testAccount.user,
                smtpPass: testAccount.pass,
            },
        });

        console.log(`Sender ${i + 1}: ${sender.email} (id: ${sender.id})`);
    }

    console.log("\nDone! All senders seeded with real Ethereal SMTP credentials.");
}

main()
    .catch((err) => {
        console.error("Seed failed:", err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());