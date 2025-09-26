import {
    getFirestore,
    doc,
    getDoc,
    writeBatch,
    serverTimestamp,

} from 'firebase/firestore';
import moment from 'moment-timezone';
export const updateApproveCvAndTimeAllotment = async (req, res) => {
    try {
        const { documentIds } = req.body;

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

        let notifications = [];

        for (const docId of documentIds) {
            if (typeof docId !== "string" || docId.trim() === "") {
                throw new Error(`Invalid document ID: ${docId}`);
            }

            const docRef = doc(db, "NewspaperJobAllocation", docId);

            batch.update(docRef, {
                aprovedcw: true,
                timeofallotment: currentTimeIST,
                completed: false,
                invoiceraised: false,
            });

            const allocationSnap = await getDoc(docRef);
            if (allocationSnap.exists()) {
                const allocationData = allocationSnap.data();

                const roNumber = allocationData.ronumber;
                const userRef = allocationData.newspaperrefuserref;

                if (userRef) {
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        const userEmail = userData.email;
                        const userName = userData.display_name;
                        if (userEmail) {
                            notifications.push({
                                to: userEmail,
                                roNumber: roNumber,
                                addressTo: userName || "User",
                            });
                        }
                    }
                }
            }
        }

        await batch.commit();

        notifications.forEach(async (mail) => {
            try {
                await fetch("https://nodemailer-henna.vercel.app/email/release-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(mail),
                });
                console.log(`Email sent to ${mail.to}`);
            } catch (err) {
                console.error(`Failed to send email to ${mail.to}:`, err.message);
            }
        });

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
    } catch (error) {
        console.error("Error in updateApproveCvAndTimeAllotment:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update documents",
            error: error.message,
        });
    }
};