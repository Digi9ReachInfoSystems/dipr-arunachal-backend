// controllers/newspaperJobAllocationController.ts
import type e from "express";
import type { Request, Response } from "express";
import {
    getFirestore,
    doc,
    getDoc,
    writeBatch,
    serverTimestamp,
    getDocs,
    collection,
    DocumentReference,
    type DocumentData,
} from "firebase/firestore";
import moment from "moment-timezone";

// Define types for notification payloads
interface UserNotification {
    to: string;
    roNumber: string;
    addressTo: string;
}

interface VendorNotification {
    roNumber: string;
    result: string;
    resultComment: string;
}

export const updateApproveCvAndTimeAllotment = async (req: Request, res: Response) => {
    try {
        const { documentIds, addressTo, to, advertisementNumber } = req.body as {
            documentIds: string[];
            addressTo?: string;
            to?: string;
            advertisementNumber?: string;
        };

        // Validate request body
        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "documentIds array is required and cannot be empty",
            });
        }

        const db = getFirestore();
        const batch = writeBatch(db);

        const currentTimeIST = moment()
            .tz("Asia/Kolkata")
            .format("DD MMMM YYYY [at] HH:mm:ss [UTC+5:30]");

        const notifications: UserNotification[] = [];
        const notificationApproved: VendorNotification[] = [];
        const newsPaperList: string[] = [];

        for (const docId of documentIds) {
            if (typeof docId !== "string" || docId.trim() === "") {
                throw new Error(`Invalid document ID: ${docId}`);
            }

            const docRef: DocumentReference<DocumentData> = doc(db, "NewspaperJobAllocation", docId);

            // Add Firestore update to batch
            batch.update(docRef, {
                aprovedcw: true,
                timeofallotment: serverTimestamp(),
                completed: false,
                invoiceraised: false,
            });

            const allocationSnap = await getDoc(docRef);
            if (allocationSnap.exists()) {
                const allocationData = allocationSnap.data();
                const roNumber: string | undefined = allocationData.ronumber;
                const userRef: DocumentReference<DocumentData> | undefined =
                    allocationData.newspaperrefuserref;

                if (userRef) {
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data() as { email?: string; display_name?: string };
                        const userEmail = userData.email;
                        const paperName = userData.display_name;

                        if (paperName) {
                            newsPaperList.push(paperName);
                        }
                        if (userEmail && roNumber) {
                            notifications.push({
                                to: userEmail,
                                roNumber,
                                addressTo: addressTo || "User",
                            });
                            notificationApproved.push({
                                roNumber,
                                result: "approved",
                                resultComment: "and sent for approval to the vendor.",
                            });
                        }
                    }
                }
            }
        }

        await batch.commit();

        // Send mail to users
        for (const mail of notifications) {
            try {
                await fetch(`${process.env.NODEMAILER_BASE_URL}/email/release-order`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(mail),
                });
                console.log(`Email sent to ${mail.to}`);
            } catch (err: any) {
                console.error(`Failed to send email to ${mail.to}:`, err.message);
            }
        }

        // Send mail to vendor
        const usersEmailSnap = await getDocs(collection(db, "UsersEmail"));
        if (!usersEmailSnap.empty) {
            const docSnap = usersEmailSnap.docs[0];
            if (!docSnap) {
                throw new Error("UsersEmail document does not exist");
            }
            const usersEmailData = docSnap.data();
            const toMail = usersEmailData["technicalassistantadvtgmailcom"];

            for (const mail of notificationApproved) {
                try {
                    await fetch(`${process.env.NODEMAILER_BASE_URL}/email/accepting`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            to: toMail,
                            roNumber: mail.roNumber,
                            result: mail.result,
                            resultComment: mail.resultComment,
                        }),
                    });
                    console.log(`Accepting email sent to ${to} for RO ${mail.roNumber}`);
                } catch (err: any) {
                    console.error(`Failed to send accepting email to ${to}:`, err.message);
                }
            }
        }

        // Send mail to department
        try {
            await fetch(`${process.env.NODEMAILER_BASE_URL}/email/informDept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to,
                    advertisementNumber,
                    cc: "diprarunadvt@gmail.com",
                    listOfNewspapers: newsPaperList,
                }),
            });
            console.log(`Email sent to department`, to);
        } catch (err: Error | any) {
            console.error(`Failed to send email to ${to}:`, err.message);
        }

        res.status(200).json({
            success: true,
            message: `${documentIds.length} document(s) updated. Emails attempted.`,
            data: {
                updatedCount: documentIds.length,
                timestamp: currentTimeIST,
                collection: "NewspaperJobAllocation",
                notifiedUsers: notifications.map((n) => n.to),
            },
        });
    } catch (error: Error | any) {
        console.error("Error in updateApproveCvAndTimeAllotment:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update documents",
            error: error.message,
        });
    }
};
