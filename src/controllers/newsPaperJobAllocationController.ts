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
    where,
    updateDoc,
    addDoc,
    increment,
    setDoc
} from "firebase/firestore";
import moment from "moment-timezone";
import db from "../configs/firebase.js";
import ActionLog, { AllocationType } from "../models/actionLogModel.js";
import { da } from "date-fns/locale";


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
                    cc: process.env.CC_MAIL,
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

export const approveNewspaperJobAllocationByVendor = async (req: Request, res: Response) => {
    const { JobApplicationId, user_ref, user_role, platform, screen } = req.body;
    if (!JobApplicationId) {
        return res.status(400).json({
            success: false,
            message: "ID parameter is required",
        });
    }

    const docRef = doc(db, "NewspaperJobAllocation", JobApplicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return res.status(404).json({
            success: false,
            message: "NewspaperJobAllocation not found",
        });
    }
    const data = docSnap.data();
    try {



        if (!data) {
            return res.status(404).json({
                success: false,
                message: "NewspaperJobAllocation not found",
            });
        }
        //  Step 1 — Update NewspaperJobAllocation document
        await updateDoc(docRef, {
            acknowledgedboolean: true,
            acknowledgementtime: serverTimestamp(),
            completed: true
        });

        //create actionLogs
        const actionLog = new ActionLog({
            user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
            islogin: false,
            rodocref: docRef,
            ronumber: data.roNumber,
            old_data: data,
            edited_data: {
                ...data,
                acknowledgedboolean: true,
                acknowledgementtime: serverTimestamp(),
                completed: true
            },
            user_role,
            action: 8,
            message: "Approved Newspaper Job Allocation ",
            status: "Success",
            platform: platform,
            networkip: req.ip || null,
            screen: screen,
            adRef: data.adref,
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null
            }
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLog })

        //  Step 2 — Update Advertisement document
        // const adDocRef = doc(db, "Advertisements", data.adref);

        const adDocSnap = await getDoc(data.adref);

        if (!adDocSnap.exists()) {
            return res.status(404).json({
                success: false,
                message: "Advertisement not found",
            });
        }

        const adData = adDocSnap.data() as { approvednewspaperslocal?: DocumentReference[];[key: string]: any };
        if (!adData) {
            return res.status(404).json({
                success: false,
                message: "Advertisement not found",
            });
        }
        let approvednewspaperslocal = adData?.approvednewspaperslocal || [];
        approvednewspaperslocal.push(doc(db, "Users", req.body.user_ref));

        // remove duplicates safely
        const uniqueByPath = new Map();
        approvednewspaperslocal.forEach(ref => {
            const path = typeof ref === "string" ? ref : ref.path;
            uniqueByPath.set(path, ref);
        });
        approvednewspaperslocal = Array.from(uniqueByPath.values());
        await updateDoc(data.adref, {
            Status_Vendor: 1,
            approvednewspaperslocal: approvednewspaperslocal,
        });

        //mail functionality

        const userRef = doc(db, "Users", req.body.user_ref);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const usersEmailSnap = await getDocs(collection(db, "UsersEmail"));
        const userEmailDocSnap = usersEmailSnap.docs[0];
        if (!userEmailDocSnap) {
            throw new Error("UsersEmail document does not exist");
        }
        const usersEmailData = userEmailDocSnap.data();
        const toMail = usersEmailData["technicalassistantadvtgmailcom"];
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/ro-status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: toMail,
                    // to: "jayanthbr@digi9.co.in",
                    roNumber: data.roNumber,
                    vendorName: userData.display_name,
                    vendorContact: userData.email,
                    result: "accepted",
                    resultComment: " All necessary checks have been completed, and the order is now ready for billing.",
                    addressTo: "ADVT Cell"
                }),
            });
            if (response.status == 200) {
                //create action log for mail sent
                const actionLog = new ActionLog({
                    user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                    islogin: false,
                    rodocref: docRef, // each allocation doc ref
                    ronumber: null,
                    old_data: {},
                    edited_data: {},
                    user_role,
                    action: 10,
                    message: `Vendor Approve Release Order mail sent successfully to department ${toMail}`,
                    status: "Success",
                    platform: platform,
                    networkip: req.ip || null,
                    screen,
                    Newspaper_allocation: {
                        Newspaper: [],
                        allotedtime: null,
                        allocation_type: null,
                        allotedby: null,
                    },
                    adRef: data.adref,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                });
                const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            } else {
                const actionLog = new ActionLog({
                    user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                    islogin: false,
                    rodocref: docRef, // each allocation doc ref
                    ronumber: null,
                    old_data: {},
                    edited_data: {},
                    user_role,
                    action: 10,
                    message: `Vendor Approve Release Order mail failed to send to department ${toMail}`,
                    status: "Failed",
                    platform: platform,
                    networkip: req.ip || null,
                    screen,
                    Newspaper_allocation: {
                        Newspaper: [],
                        allotedtime: null,
                        allocation_type: null,
                        allotedby: null,
                    },
                    adRef: data.adref,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                });
                const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            }
            console.log("Mail sent successfully:", response);
        } catch (error: any) {
            console.error("❌ Error in sending mail:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to send mail",
                error: error.message,
            });
        }

        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/VendorStausDept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: adData.Bearingno,
                    // to: "jayanthbr@digi9.co.in",
                    roNumber: data.roNumber,
                    vendorName: userData.display_name,
                    vendorContact: userData.email,
                }),
            });
            if (response.status == 200) {
                //create action log for mail sent
                const actionLog = new ActionLog({
                    user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                    islogin: false,
                    rodocref: docRef, // each allocation doc ref
                    ronumber: null,
                    old_data: {},
                    edited_data: {},
                    user_role,
                    action: 10,
                    message: `Vendor Approve Release Order mail sent successfully to department ${data.Bearingno}`,
                    status: "Success",
                    platform: platform,
                    networkip: req.ip || null,
                    screen,
                    Newspaper_allocation: {
                        Newspaper: [],
                        allotedtime: null,
                        allocation_type: null,
                        allotedby: null,
                    },
                    adRef: data.adref,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                });
                const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            } else {
                const actionLog = new ActionLog({
                    user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                    islogin: false,
                    rodocref: docRef, // each allocation doc ref
                    ronumber: null,
                    old_data: {},
                    edited_data: {},
                    user_role,
                    action: 10,
                    message: `Vendor Approve Release Order mail failed to send to department ${data.Bearingno}`,
                    status: "Failed",
                    platform: platform,
                    networkip: req.ip || null,
                    screen,
                    Newspaper_allocation: {
                        Newspaper: [],
                        allotedtime: null,
                        allocation_type: null,
                        allotedby: null,
                    },
                    adRef: data.adref,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                });
                const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            }
            console.log("Mail sent successfully:", response);
        } catch (error: any) {
            console.error("❌ Error in sending mail:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to send mail",
                error: error.message,
            });
        }

        res.status(200).json({ success: true, message: "NewspaperJobAllocation approved successfully" });
    } catch (error: any) {
        console.error("❌ Error in approveNewspaperJobAllocationByVendor:", error);
        //create action log
        const actionLog = new ActionLog({
            user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
            islogin: false,
            rodocref: docRef,
            ronumber: data.roNumber,
            old_data: {},
            edited_data: {

            },
            user_role,
            action: 8,
            message: "Failed to approve Newspaper Job Allocation by Vendor",
            status: "Failed",
            platform: platform,
            networkip: req.ip || null,
            screen: screen,
            adRef: data.adref,
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null
            }
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLog })
        return res.status(500).json({
            success: false,
            message: "Failed to approve NewspaperJobAllocation",
            error: error.message,
        });
    }
};


export const rejectNewspaperJobAllocationByVendor = async (req: Request, res: Response) => {
    const { JobApplicationId, rejectReason, user_ref, user_role, platform, screen } = req.body;
    if (!JobApplicationId) {
        return res.status(400).json({
            success: false,
            message: "ID parameter is required",
        });
    }

    const docRef = doc(db, "NewspaperJobAllocation", JobApplicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return res.status(404).json({
            success: false,
            message: "NewspaperJobAllocation not found",
        });
    }
    const data = docSnap.data();
    try {
        updateDoc(docRef, {
            reasonRejection: rejectReason,
            acknowledgementtime: serverTimestamp(),
            completed: true,
            aprovedcw: false,
        });


        const adDocSnap = await getDoc(data.adref);

        if (!adDocSnap.exists()) {
            return res.status(404).json({
                success: false,
                message: "Advertisement not found",
            });
        }

        const adData = adDocSnap.data() as { approvednewspaperslocal?: DocumentReference[];[key: string]: any };
        if (!adData) {
            return res.status(404).json({
                success: false,
                message: "Advertisement not found",
            });
        }
        let Rejectednewspapers = adData?.Rejectednewspapers || [];
        Rejectednewspapers.push(doc(db, "Users", req.body.user_ref));

        // remove duplicates safely
        const uniqueByPath = new Map();
        Rejectednewspapers.forEach((ref: any) => {
            const path = typeof ref === "string" ? ref : ref.path;
            uniqueByPath.set(path, ref);
        });
        Rejectednewspapers = Array.from(uniqueByPath.values());
        let allotednewspapers = adData?.allotednewspapers || [];
        allotednewspapers = allotednewspapers.filter((ref: any) => {
            const path = typeof ref === "string" ? ref : ref.path;
            return !Rejectednewspapers.some((rejectedRef: any) => {
                const rejectedPath = typeof rejectedRef === "string" ? rejectedRef : rejectedRef.path;
                return path === rejectedPath;
            });
        });
        await updateDoc(data.adref, {
            Status_Vendor: 1,
            Rejectednewspapers: Rejectednewspapers,
            allotednewspapers: allotednewspapers,
            reasonOfRejection: rejectReason,
            IsrequesPending: false,
            isDarft: false,
            DateOfRejection: serverTimestamp(),
        });

        const userRef = doc(db, "Users", req.body.user_ref);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data() || {};

        const usersEmailSnap = await getDocs(collection(db, "UsersEmail"));
        const userEmailDocSnap = usersEmailSnap.docs[0];
        if (!userEmailDocSnap) {
            throw new Error("UsersEmail document does not exist");
        }
        const usersEmailData = userEmailDocSnap.data();
        const toMail = usersEmailData["technicalassistantadvtgmailcom"];
        const toMailTwo = usersEmailData["ddipradvtgmailcom"];
        if (data.manuallyallotted == true) {


            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/ro-status`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMail,
                        // to: "jayanthbr@digi9.co.in",
                        roNumber: data.roNumber,
                        vendorName: userData.display_name,
                        vendorContact: userData.email,
                        result: "rejected (manually allocated)",
                        resultComment: "Please review the feedback provided.",
                        addressTo: "ADVT Cell"
                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                        islogin: false,
                        rodocref: docRef, // each allocation doc ref
                        ronumber: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 10,
                        message: `Vendor Reject Release Order mail sent successfully to department ${toMail}`,
                        status: "Success",
                        platform: platform,
                        networkip: req.ip || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: data.adref,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                        islogin: false,
                        rodocref: docRef, // each allocation doc ref
                        ronumber: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 10,
                        message: `Vendor Reject Release Order mail failed to send to department ${toMail}`,
                        status: "Failed",
                        platform: platform,
                        networkip: req.ip || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: data.adref,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                }
                console.log("Mail sent successfully:", response);
            } catch (error: any) {
                console.error("❌ Error in sending mail:", error);
                return res.status(500).json({
                    success: false,
                    message: "Failed to send mail",
                    error: error.message,
                });
            }

            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/ro-status`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMailTwo,
                        // to: "jayanthbr@digi9.co.in",
                        roNumber: data.roNumber,
                        vendorName: userData.display_name,
                        vendorContact: userData.email,
                        result: "rejected (manually allocated)",
                        resultComment: "Please review the feedback provided.",
                        addressTo: "ADVT Cell"
                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                        islogin: false,
                        rodocref: docRef, // each allocation doc ref
                        ronumber: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 10,
                        message: `Vendor Reject Release Order mail sent successfully to department ${toMailTwo}`,
                        status: "Success",
                        platform: platform,
                        networkip: req.ip || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: data.adref,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                        islogin: false,
                        rodocref: docRef, // each allocation doc ref
                        ronumber: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 10,
                        message: `Vendor Reject Release Order mail failed to send to department ${toMailTwo}`,
                        status: "Failed",
                        platform: platform,
                        networkip: req.ip || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: data.adref,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                }
                console.log("Mail sent successfully:", response);
            } catch (error: any) {
                console.error("❌ Error in sending mail:", error);
                return res.status(500).json({
                    success: false,
                    message: "Failed to send mail",
                    error: error.message,
                });
            }
        } else {
            let logStatus = "success";
            let logMessage = "Automatic allocation completed successfully.";
            let oldData: any = {};
            let editedData: any = {};
            // 🔹 Calculate due time (7 PM IST today)
            const istOffsetMs = 5.5 * 60 * 60 * 1000;
            const now = new Date();
            const nowIST = new Date(now.getTime() + istOffsetMs);
            const dueIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate(), 19, 0, 0, 0);
            const dueUTC = new Date(dueIST.getTime());
            const networkip = req.ip || null;
            const adRef = data.adref;
            const adSnap = await getDoc(adRef);
            if (!adSnap.exists()) throw new Error("Advertisement not found");
            oldData = adSnap.data();
            const jobLogicSnap = await getDocs(collection(db, "joblogic"));
            if (jobLogicSnap.empty) throw new Error("Joblogic not found");
            const joblogicDoc = jobLogicSnap.docs[0];
            if (!joblogicDoc) throw new Error("Joblogic document not found");
            const joblogicRef = doc(db, "joblogic", joblogicDoc.id);
            const jobLogicData = joblogicDoc.data();
            const ronumbers = jobLogicData.ronumbers || 0;
            const newspapers = jobLogicData.waitingquuelist || [];

            let newNewsPaperRef: DocumentReference | null = null;
            newNewsPaperRef = newspapers[0];

            const newNewsPaperSnap = await getDoc(newNewsPaperRef!);
            if (!newNewsPaperSnap.exists()) throw new Error("NewsPaper not found");
            const newNewsPaperData = newNewsPaperSnap.data();
            const newNewsPaper = newNewsPaperData || null;

            let newAllotedNewsPaper = oldData.allotednewspapers;
            newAllotedNewsPaper.push(newNewsPaperRef);

            //update Advertisement

            await updateDoc(adRef, {
                allotednewspapers: newAllotedNewsPaper,
            });

            //create New newsPaperJobAllocation

            const allocationPayload = {
                timeofallotment: serverTimestamp(),
                acknowledgedboolean: false,
                newspaperrefuserref: newNewsPaperRef,
                adref: adRef,
                completed: false,
                aprovedcw: true,
                invoiceraised: false,
                duetime: dueUTC,
                ronumber: `DIPR/ARN/${ronumbers}`,
                createdAt: serverTimestamp(),
            };
            //create New newsPaperJobAllocation

            // const newNewsPaperJobAllocationRef = doc(collection(db, "newsPaperJobAllocation"));
            const newNewsPaperJobAllocationRef = await addDoc(collection(db, "NewspaperJobAllocation"), allocationPayload);
            // await setDoc(newNewsPaperJobAllocationRef, allocationPayload);
            // await newDocRef.set(allocationPayload);
            //create action Log
            const actionLog = new ActionLog({
                user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                islogin: false,
                rodocref: newNewsPaperJobAllocationRef, // each allocation doc ref
                ronumber: allocationPayload.ronumber,
                old_data: {},
                edited_data: {},
                user_role,
                action: 3,
                message: "Automatic allocation successful sent to newspapers",
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen,
                Newspaper_allocation: {
                    Newspaper: newAllotedNewsPaper as unknown as DocumentReference<DocumentData>[],
                    allotedtime: new Date(),
                    allocation_type: AllocationType.AUTOMATIC,
                    allotedby: user_ref ? doc(db, "Users", user_ref) : null,
                },
                adRef: data.adref,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
            });
            const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });


            //update jobLogic collection and increment ronumbers
            const updatedQueue = [
                ...newspapers.slice(1),
                newNewsPaperRef
            ]
            await updateDoc(joblogicRef, {
                waitingquuelist: updatedQueue,
                ronumbers: increment(1),
                updatedAt: serverTimestamp(),
            });

            //sending mail
            // to vendor
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/release-order`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: newNewsPaper.email,
                        roNumber: `DIPR/ARN/${ronumbers}`,
                        addressTo: "Technical Assistant",
                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                        islogin: false,
                        rodocref:newNewsPaperJobAllocationRef, // each allocation doc ref
                        ronumber: `DIPR/ARN/${ronumbers}`,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 10,
                        message: `Manual Allocation sent  to newspaper mail sent to vendors Successfully to mail id ${ newNewsPaper.email}`,
                        status: "Success",
                        platform: platform,
                        networkip: req.ip || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: adRef,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                        islogin: false,
                        rodocref:newNewsPaperJobAllocationRef, // each allocation doc ref
                        ronumber:  `DIPR/ARN/${ronumbers}`,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 10,
                        message: `Manual Allocation sent  to newspaper mail sent to vendors Failed to mail id ${newNewsPaper.email } `,
                        status: "Failed",
                        platform: platform,
                        networkip: req.ip || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: adRef,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                }
                console.log(`Email sent to ${newNewsPaper.email}`, response);
            } catch (err: any) {
                console.error(`Failed to send email to ${newNewsPaper.email}:`, err.message);
            }
            //reject Mails

            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/ro-status`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMail,
                        // to: "jayanthbr@digi9.co.in",
                        roNumber: data.roNumber,
                        vendorName: userData.display_name,
                        vendorContact: userData.email,
                        result: "rejected (manually allocated)",
                        resultComment: "Please review the feedback provided.",
                        addressTo: "ADVT Cell"
                    }),

                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                        islogin: false,
                        rodocref: docRef, // each allocation doc ref
                        ronumber: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 10,
                        message: `Vendor Reject Release Order mail sent successfully to department ${toMail}`,
                        status: "Success",
                        platform: platform,
                        networkip: req.ip || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: data.adref,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                        islogin: false,
                        rodocref: docRef, // each allocation doc ref
                        ronumber: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 10,
                        message: `Vendor Reject Release Order mail failed to send to department ${toMail}`,
                        status: "Failed",
                        platform: platform,
                        networkip: req.ip || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: data.adref,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                }
                console.log("Mail sent successfully:", response);
            } catch (error: any) {
                console.error("❌ Error in sending mail:", error);
                return res.status(500).json({
                    success: false,
                    message: "Failed to send mail",
                    error: error.message,
                });
            }

            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/ro-status`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMailTwo,
                        // to: "jayanthbr@digi9.co.in",
                        roNumber: data.roNumber,
                        vendorName: userData.display_name,
                        vendorContact: userData.email,
                        result: "rejected (manually allocated)",
                        resultComment: "Please review the feedback provided.",
                        addressTo: "ADVT Cell"
                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                        islogin: false,
                        rodocref: docRef, // each allocation doc ref
                        ronumber: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 10,
                        message: `Vendor Reject Release Order mail sent successfully to department ${toMailTwo}`,
                        status: "Success",
                        platform: platform,
                        networkip: req.ip || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: data.adref,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                        islogin: false,
                        rodocref: docRef, // each allocation doc ref
                        ronumber: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 10,
                        message: `Vendor Reject Release Order mail failed to send to department ${toMailTwo}`,
                        status: "Failed",
                        platform: platform,
                        networkip: req.ip || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: data.adref,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                }
                console.log("Mail sent successfully:", response);
            } catch (error: any) {
                console.error("❌ Error in sending mail:", error);
                return res.status(500).json({
                    success: false,
                    message: "Failed to send mail",
                    error: error.message,
                });
            }




        }

        //  create action logs
        const newDataSnap = await getDoc(docRef);
        const newData = newDataSnap.data();

        const actionLog = new ActionLog({
            user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
            islogin: false,
            rodocref: docRef,
            ronumber: data.roNumber,
            old_data: data,
            edited_data: newData || {},
            user_role,
            action: 9,
            message: `NewspaperJobAllocation rejected successfully by vendor`,
            status: "Success",
            platform: platform,
            networkip: req.ip || null,
            screen: screen,
            adRef: data.adref,
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null
            }
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLog })

        res.status(200).json({
            success: true,
            message: "NewspaperJobAllocation rejected successfully",
        });

    } catch (error: any) {
        console.error("❌ Error in rejectNewspaperJobAllocationByVendor:", error);
        // create action logs
        const actionLog = new ActionLog({
            user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
            islogin: false,
            rodocref: docRef,
            ronumber: data.roNumber,
            old_data: data,
            edited_data: {},
            user_role,
            action: 9,
            message: `NewspaperJobAllocation rejected failed by vendor ${error}`,
            status: "Failed",
            platform: platform,
            networkip: req.ip || null,
            screen: screen,
            adRef: data.adref,
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null
            }
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLog });
        return res.status(500).json({
            success: false,
            message: "Failed to reject NewspaperJobAllocation",
            error: error.message,
        });
    }
};