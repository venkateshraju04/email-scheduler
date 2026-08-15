import "dotenv/config";
import { prisma } from "./client";

async function main() {
    const sender = await prisma.sender.create({
        data: {
            email: "test.sender@ethereal.email",
            smtpUser: "placeholder",
            smtpPass: "placeholder",
        },
    });
    console.log("Seeded sender:", sender);
}

main().finally(() => prisma.$disconnect());