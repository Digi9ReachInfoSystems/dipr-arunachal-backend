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
    Timestamp,
    query,
    where
} from "firebase/firestore";
import moment from "moment-timezone";
import db from "../configs/firebase.js";

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
                    cc:process.env.CC_MAIL,
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

export const getNewspaperJobAllocationsCount = async (req: Request, res: Response) => {
    const { year } = req.params;
    if (!year) {
        return res.status(400).json({
            success: false,
            message: "Year parameter is required",
        });
    }
    try {
        const startDate = new Date(`${year}-01-01T00:00:00Z`);
        const endDate = new Date(`${year}-12-31T23:59:59Z`);
        const querySnapshot = await getDocs(
            query(
                collection(db, "NewspaperJobAllocation"),
                where("createdAt", ">=", Timestamp.fromDate(startDate)),
                where("createdAt", "<=", Timestamp.fromDate(endDate))
            )
        );
        const count = querySnapshot.size;

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ];
        const monthQueries = monthNames.map((month, i) => {
            const start = new Date(Date.UTC(Number(year), i, 1, 0, 0, 0));
            const end = new Date(Date.UTC(Number(year), i + 1, 0, 23, 59, 59)); // handles variable month length automatically

            return getDocs(
                query(
                    collection(db, "NewspaperJobAllocation"),
                    where("createdAt", ">=", Timestamp.fromDate(start)),
                    where("createdAt", "<=", Timestamp.fromDate(end))
                )
            ).then((snap) => ({
                month,
                count: snap.size,
            }));
        });

        const monthlyData = await Promise.all(monthQueries);
        // console.log(`Year ${year}: Total advertisements = ${count}`, monthlyData);
        res.status(200).json({ success: true, year, count, monthlyData });


    } catch (error: Error | any) {
        console.error("Error in getNewspaperJobAllocationsCount:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch count",
            error: error.message,
        });
    }
};


export const getNewspaperJobAllocationsCountByUser = async (req: Request, res: Response) => {
  const { year } = req.params;

  if (!year) {
    return res.status(400).json({
      success: false,
      message: "Year parameter is required",
    });
  }

  try {
    const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59Z`);

    // 🔹 Fetch all NewspaperJobAllocation docs in the given year
    const snapshot = await getDocs(
      query(
        collection(db, "NewspaperJobAllocation"),
        where("createdAt", ">=", Timestamp.fromDate(startOfYear)),
        where("createdAt", "<=", Timestamp.fromDate(endOfYear))
      )
    );

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: `No NewspaperJobAllocation records found for year ${year}`,
      });
    }

    interface NewspaperJobAllocationDoc {
      id: string;
      newspaperrefuserref?: DocumentReference;
      createdAt?: Timestamp;
      [key: string]: any;
    }

    const allDocs: NewspaperJobAllocationDoc[] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const usersMap: Record<string, any> = {};

    // 🔹 Collect all unique user references
    const uniqueUserRefs: DocumentReference[] = [];
    const userRefMap = new Map<string, { id: string; name: string }>();

    for (const doc of allDocs) {
      if (doc.newspaperrefuserref) {
        const ref = doc.newspaperrefuserref as DocumentReference;
        const path = ref.path;
        if (!userRefMap.has(path)) uniqueUserRefs.push(ref);
      }
    }

    // 🔹 Fetch all user names & IDs in parallel
    const userSnapshots = await Promise.all(uniqueUserRefs.map((ref) => getDoc(ref)));
    userSnapshots.forEach((snap) => {
      if (snap.exists()) {
        userRefMap.set(snap.ref.path, {
          id: snap.id,
          name: snap.data().display_name || "Unknown",
        });
      }
    });

    // 🔹 Group allocations by user
    for (const doc of allDocs) {
      const refPath = doc.newspaperrefuserref?.path || "unknown";
      const userInfo = userRefMap.get(refPath) || { id: "unknown", name: "Unknown" };
      const createdAt = doc.createdAt?.toDate ? doc.createdAt.toDate() : null;

      if (!usersMap[userInfo.id]) {
        usersMap[userInfo.id] = {
          userId: userInfo.id,
          userName: userInfo.name,
          total: 0,
          monthlyCounts: Array(12).fill(0),
        };
      }

      if (createdAt) {
        const monthIndex = createdAt.getMonth();
        usersMap[userInfo.id].monthlyCounts[monthIndex] += 1;
        usersMap[userInfo.id].total += 1;
      }
    }

    // 🔹 Format output
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    const formattedData = Object.values(usersMap).map((data: any) => ({
      userId: data.userId,
      userName: data.userName,
      total: data.total,
      monthlyData: data.monthlyCounts.map((count: number, i: number) => ({
        month: monthNames[i],
        count,
      })),
    }));

    const totalCount = allDocs.length;

    return res.status(200).json({
      success: true,
      year,
      totalCount,
      users: formattedData,
    });
  } catch (error: any) {
    console.error("❌ Error in getNewspaperJobAllocationsCountByUser:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch counts",
      error: error.message,
    });
  }
};