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
    setDoc,
    updateDoc,
    addDoc,

} from "firebase/firestore";
import moment from "moment-timezone";
import db from "../configs/firebase.js";
import Invoice from "../models/invoiceRequestModel.js";
// Import ActionLog model or interface
import ActionLog from "../models/actionLogModel.js";
import { ca, ro } from "date-fns/locale";

export const getInvoiceRequestCount = async (req: Request, res: Response) => {
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
                collection(db, "Invoice_Request"),
                where("DateOfInvoice", ">=", Timestamp.fromDate(startDate)),
                where("DateOfInvoice", "<=", Timestamp.fromDate(endDate))
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
                    collection(db, "Invoice_Request"),
                    where("DateOfInvoice", ">=", Timestamp.fromDate(start)),
                    where("DateOfInvoice", "<=", Timestamp.fromDate(end))
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
        console.error("Error in Invoice_Request count:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch count",
            error: error.message,
        });
    }
};

export const createInvoice = async (req: Request, res: Response) => {

    const {
        Assitanttatus,
        DateOfInvoice,
        DeptName,
        InvoiceUrl,
        Newspaperclip,
        Ronumber,
        TypeOfDepartment,
        Userref,
        advertiseRef,
        billingAddress,
        billno,
        clerkDivision,
        deputyDirector_status,
        //   deputydirecotor,
        invoiceamount,
        isSendForward,
        jobref,
        newspaperpageNo,
        phoneNumber,
        //   sendAgain,
        vendorName,
        user_id,
        user_role,
        platform,
        screen
    } = req.body;
    try {
        // Basic validation
        if (!Ronumber || !InvoiceUrl || !Userref) {
            return res.status(400).json({
                success: false,
                message: "Ronumber, InvoiceUrl, and Userref are required fields.",
            });
        }

        // Convert references
        let userRef: DocumentReference | null = null;
        if (Userref) {
            const collectionData = Userref.split("/");
            if (collectionData.length > 0) {
                userRef = doc(db, collectionData[1], collectionData[2]);
            }

        }
        let adRef: DocumentReference | null = null;
        if (advertiseRef) {
            const collectionData = advertiseRef.split("/");
            if (collectionData.length > 0) {
                adRef = doc(db, collectionData[1], collectionData[2]);
            }
        }

        let jobRef: DocumentReference | null = null;
        if (jobref) {
            const collectionData = jobref.split("/");
            if (collectionData.length > 0) {
                jobRef = doc(db, collectionData[1], collectionData[2]);
            }
        }


        // Build payload
        const invoiceData = {
            Assitanttatus: Assitanttatus || 0,
            DateOfInvoice: DateOfInvoice ? new Date(DateOfInvoice) : serverTimestamp(),
            DeptName: DeptName || "",
            InvoiceUrl: InvoiceUrl || "",
            Newspaperclip: Newspaperclip || "",
            Ronumber: Ronumber || "",
            TypeOfDepartment: TypeOfDepartment || "",
            Userref: userRef,
            advertiseRef: adRef,
            billingAddress: billingAddress || "",
            billno: billno || "",
            clerkDivision: clerkDivision || 0,
            deputyDirector_status: deputyDirector_status || 0,
            invoiceamount: invoiceamount || 0,
            isSendForward: isSendForward || false,
            jobref: jobRef,
            newspaperpageNo: newspaperpageNo || "",
            phoneNumber: phoneNumber || "",
            vendorName: vendorName || "",
            createdAt: serverTimestamp(),
        };

        // Create Firestore document
        const invoiceCollection = collection(db, "Invoice_Request");

        const docRef = doc(invoiceCollection); // auto ID
        await setDoc(docRef, invoiceData);
        //create actionLogs
        const actionLog = new ActionLog({
            user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
            islogin: false,
            rodocref: jobRef,
            ronumber: Ronumber,
            docrefinvoice: docRef,
            old_data: {},
            edited_data: {},
            user_role,
            action: 9,
            message: `Invoice Raised by vendor and Invoice Request document created path: /invoiceRequest${req.path}`,
            status: "Success",
            platform: platform,
            networkip: req.ip || null,
            screen: screen,
            adRef: adRef,
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null
            }
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLog })


        //update advertisement
        if (adRef) {
            let invoicerefList: DocumentReference[] = [];
            //get existing invoice ref list
            const adSnap = await getDoc(adRef);
            const oldData = adSnap.data();
            if (adSnap.exists()) {
                invoicerefList = adSnap.get("invoicerefList") || [];
            }
            invoicerefList.push(docRef);
            //remove duplicate based on path
            const uniqueByPath = new Map();
            invoicerefList.forEach(ref => {
                const path = typeof ref === "string" ? ref : ref.path;
                uniqueByPath.set(path, ref);
            });
            invoicerefList = Array.from(uniqueByPath.values());
            await updateDoc(adRef, {
                Invoice_Assistant: 0,
                isuploaded: true,
                Status_Vendor: 1,
                Posted: userRef,
                invoicerefList,
                Release_order_no: Ronumber,
                Invoice_deputy: 0
            });
            const editedData = (await getDoc(adRef)).data();
            //create actionLogs
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: docRef,
                old_data: oldData || {},
                edited_data: editedData || {},
                user_role,
                action: 6,
                message: `Invoice Raised by vendor and Advertisement Document updated path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: adRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
        }
        // update newspaper job allocation
        if (jobRef) {
            let oldData: any = {};
            const jobSnap = await getDoc(jobRef);
            if (jobSnap.exists()) {
                oldData = jobSnap.data();
            }
            await updateDoc(jobRef, {
                invoiceraised: true,
            });
            const editedData = (await getDoc(jobRef)).data();
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: jobRef,
                ronumber: Ronumber,
                docrefinvoice: docRef,
                old_data: oldData || {},
                edited_data: editedData || {},
                user_role,
                action: 8,
                message: `Invoice Raised by vendor and Newspaper Job Allocation Document updated path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: adRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })

        }
        //invoice raised mail department\
        if (!userRef) {
            return res.status(404).json({
                success: false,
                message: "User reference is missing",
            });
        }
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
        const toMail = usersEmailData["ddipradvtgmailcom"];
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/bill-raised`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: toMail,
                    // to: "jayanthbr@digi9.co.in",
                    roNumber: Ronumber,
                    vendorName: userData.display_name,
                    vendorContact: userData.email,
                    billNumber: billno,
                    billAddress: billingAddress
                }),
            });
            if (response.status == 200) {
                //create action log for mail sent
                const actionLog = new ActionLog({
                    user_ref: user_id ? doc(db, "Users", user_id) : null,
                    islogin: false,
                    rodocref: jobRef, // each allocation doc ref
                    ronumber: Ronumber,
                    docrefinvoice: docRef,
                    old_data: {},
                    edited_data: {},
                    user_role,
                    action: 4,
                    message: `Invoice Raised mail sent successfully to department  ${toMail} path: /invoiceRequest${req.path}`,
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
                    user_ref: user_id ? doc(db, "Users", user_id) : null,
                    islogin: false,
                    rodocref: jobRef, // each allocation doc ref
                    ronumber: Ronumber,
                    docrefinvoice: docRef,
                    old_data: {},
                    edited_data: {},
                    user_role,
                    action: 4,
                    message: `Invoice Raised  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
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
                try {
                    const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            to: process.env.FAILED_LOG_TO_MAIL,
                            cc: process.env.FAILED_LOG_CC_MAIL,
                            actionName: " Create Invoice By Vendor Mail Failed",
                            actionEndpoint: `/invoiceRequest${req.path}`,
                            ErrorInfo: {
                                message: `Invoice Raised  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                                error: null
                            },
                            userInfo: {
                                uesrId: req.body.user_id,
                                role: req.body.user_role,
                                platform: req.body.platform,
                                screen: req.body.screen
                            },
                            OtherInfo: {
                                invoiceRef: docRef ? docRef : null,
                            }
                        }),
                    });
                } catch (e) {
                    console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                }
            }

        }
        catch (error) {
            console.error("Error sending email:", error);
        } //create action logs
        const actionLogSuccess = new ActionLog({
            user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
            islogin: false,
            rodocref: null,
            ronumber: null,
            docrefinvoice: null,
            old_data: {},
            edited_data: {},
            user_role,
            action: 902,
            message: `Invoice Raised by vendor Successfull path: /invoiceRequest${req.path}`,
            status: "Success",
            platform: platform,
            networkip: req.ip || null,
            screen: screen,
            adRef: null,
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null
            }
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })

        res.status(201).json({
            success: true,
            message: "Invoice created successfully",
            invoiceId: docRef.id,
        });
    } catch (error: any) {
        //create action logs
        const actionLog = new ActionLog({
            user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
            islogin: false,
            rodocref: null,
            ronumber: null,
            docrefinvoice: null,
            old_data: {},
            edited_data: {},
            user_role,
            action: 902,
            message: `Invoice Raised by vendor Failed Error- ${error.message} path: /invoiceRequest${req.path}`,
            status: "Failed",
            platform: platform,
            networkip: req.ip || null,
            screen: screen,
            adRef: null,
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null
            }
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLog })
        console.error("❌ Error creating invoice:", error);
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: " Create Invoice By Vendor",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: error.message,
                        error: error,
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {

                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }

        res.status(500).json({
            success: false,
            message: "Failed to create invoice",
            error: error.message,
        });
    }
};

export const editInvoice = async (req: Request, res: Response) => {

    const {
        InvoiceId,
        Assitanttatus,
        DateOfInvoice,
        DeptName,
        InvoiceUrl,
        Newspaperclip,
        Ronumber,
        TypeOfDepartment,
        Userref,
        advertiseRef,
        billingAddress,
        billno,
        clerkDivision,
        deputyDirector_status,
        invoiceamount,
        // isSendForward,
        jobref,
        newspaperpageNo,
        phoneNumber,
        vendorName,
        user_id,
        user_role,
        platform,
        screen
    } = req.body;
    try {


        // Reference to the invoice document
        const invoiceRef = doc(db, "Invoice_Request", InvoiceId);
        try {
            // Validate ID
            if (!InvoiceId) {
                return res.status(400).json({
                    success: false,
                    message: "InvoiceId is required.",
                });
            }


            const oldDataInvoiceSnap = (await getDoc(invoiceRef)).data();
            // Build update payload dynamically
            const updateData: any = {
                updatedAt: serverTimestamp(),
            };

            if (Assitanttatus !== undefined) updateData.Assitanttatus = Assitanttatus;
            if (DateOfInvoice !== undefined)
                updateData.DateOfInvoice = new Date(DateOfInvoice);
            if (DeptName !== undefined) updateData.DeptName = DeptName;
            if (InvoiceUrl !== undefined) updateData.InvoiceUrl = InvoiceUrl;
            if (Newspaperclip !== undefined) updateData.Newspaperclip = Newspaperclip;
            if (Ronumber !== undefined) updateData.Ronumber = Ronumber;
            if (TypeOfDepartment !== undefined)
                updateData.TypeOfDepartment = TypeOfDepartment;
            if (Userref !== undefined) {
                const collectionData = Userref.split("/");
                if (collectionData.length > 1) {
                    updateData.Userref = doc(db, collectionData[1], collectionData[2]);
                }
                // updateData.Userref = doc(db, `Users/${Userref}`);
            }
            if (advertiseRef !== undefined) {
                const collectionData = advertiseRef.split("/");
                if (collectionData.length > 1) {
                    updateData.advertiseRef = doc(db, collectionData[1], collectionData[2]);
                }
                // updateData.advertiseRef = doc(db, `Advertisement/${advertiseRef}`);

            }
            if (billingAddress !== undefined) updateData.billingAddress = billingAddress;
            if (billno !== undefined) updateData.billno = billno;
            if (clerkDivision !== undefined) updateData.clerkDivision = clerkDivision;
            if (deputyDirector_status !== undefined)
                updateData.deputyDirector_status = deputyDirector_status;
            if (invoiceamount !== undefined) updateData.invoiceamount = invoiceamount;

            if (jobref !== undefined) {
                const collectionData = jobref.split("/");
                if (collectionData.length > 1) {
                    updateData.jobref = doc(db, collectionData[1], collectionData[2]);
                }
            }
            // updateData.jobref = doc(db, `NewspaperJobAllocation/${jobref}`);
            if (newspaperpageNo !== undefined)
                updateData.newspaperpageNo = newspaperpageNo;
            if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
            if (vendorName !== undefined) updateData.vendorName = vendorName;

            // Update the document
            await updateDoc(invoiceRef, updateData);
            const newDataInvoiceSnap = (await getDoc(invoiceRef)).data();
            // create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: updateData.jobref,
                ronumber: Ronumber,
                docrefinvoice: invoiceRef,
                old_data: oldDataInvoiceSnap || {},
                edited_data: newDataInvoiceSnap || {},
                user_role,
                action: 10,
                message: `Invoice Edited by vendor and Invoice Request document updated successfully path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: updateData.jobref,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })


            //update advertisement
            if (updateData.advertiseRef) {
                let invoicerefList: DocumentReference[] = [];
                //get existing invoice ref list
                const adSnap = await getDoc(updateData.advertiseRef);
                const oldData = adSnap.data();
                if (adSnap.exists()) {
                    invoicerefList = adSnap.get("invoicerefList") || [];
                }
                invoicerefList.push(updateData.advertiseRef);
                //remove duplicate based on path
                const uniqueByPath = new Map();
                invoicerefList.forEach(ref => {
                    const path = typeof ref === "string" ? ref : ref.path;
                    uniqueByPath.set(path, ref);
                });
                invoicerefList = Array.from(uniqueByPath.values());
                await updateDoc(updateData.advertiseRef, {
                    Invoice_Assistant: 0,
                    isuploaded: true,
                    Status_Vendor: 1,
                    Posted: updateData.Userref,
                    invoicerefList,
                    Release_order_no: Ronumber,
                    Invoice_deputy: 0
                });
                const editedData = (await getDoc(updateData.advertiseRef)).data();
                //create actionLogs
                const actionLog = new ActionLog({
                    user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                    islogin: false,
                    rodocref: null,
                    ronumber: null,
                    docrefinvoice: invoiceRef,
                    old_data: oldData || {},
                    edited_data: editedData || {},
                    user_role,
                    action: 6,
                    message: `Invoice Edited by vendor and Advertisement Document updated path: /invoiceRequest${req.path}`,
                    status: "Success",
                    platform: platform,
                    networkip: req.ip || null,
                    screen: screen,
                    adRef: updateData.advertiseRef,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                    Newspaper_allocation: {
                        Newspaper: [],
                        allotedtime: null,
                        allocation_type: null,
                        allotedby: null
                    }
                });
                await addDoc(collection(db, "actionLogs"), { ...actionLog })
            }
            // update newspaper job allocation
            if (updateData.jobref) {
                let oldData: any = {};
                const jobSnap = await getDoc(updateData.jobref);
                if (jobSnap.exists()) {
                    oldData = jobSnap.data();
                }
                await updateDoc(updateData.jobref, {
                    invoiceraised: true,
                    acknowledgementtime: serverTimestamp(),
                    timeofallotment: serverTimestamp(),
                });
                const editedData = (await getDoc(updateData.jobref)).data();
                const actionLog = new ActionLog({
                    user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                    islogin: false,
                    rodocref: updateData.jobref,
                    ronumber: Ronumber,
                    docrefinvoice: invoiceRef,
                    old_data: oldData || {},
                    edited_data: editedData || {},
                    user_role,
                    action: 8,
                    message: `Invoice Edited by vendor and Newspaper Job Allocation Document updated path: /invoiceRequest${req.path}`,
                    status: "Success",
                    platform: platform,
                    networkip: req.ip || null,
                    screen: screen,
                    adRef: updateData.advertiseRef,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                    Newspaper_allocation: {
                        Newspaper: [],
                        allotedtime: null,
                        allocation_type: null,
                        allotedby: null
                    }
                });
                await addDoc(collection(db, "actionLogs"), { ...actionLog })

            }
            //invoice raised mail department\
            if (!updateData.Userref) {
                return res.status(404).json({
                    success: false,
                    message: "User reference is missing",
                });
            }
            const userSnap = await getDoc(updateData.Userref);
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
            const toMail = usersEmailData["ddipradvtgmailcom"];
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/ro-status`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMail,
                        // to: "jayanthbr@digi9.co.in",
                        roNumber: Ronumber,
                        vendorName: (userData && typeof userData === "object" && "display_name" in userData) ? (userData as any).display_name : "",
                        vendorContact: (userData && typeof userData === "object" && "email" in userData) ? (userData as any).email : "",
                        billNumber: billno,
                        billAddress: billingAddress
                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: updateData.jobref, // each allocation doc ref
                        ronumber: Ronumber,
                        docrefinvoice: invoiceRef,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Edited mail sent successfully to department  ${toMail} path: /invoiceRequest${req.path}`,
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
                        adRef: updateData.advertiseRef,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: updateData.jobref, // each allocation doc ref
                        ronumber: Ronumber,
                        docrefinvoice: invoiceRef,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Edited  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
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
                        adRef: updateData.advertiseRef,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: " Edit Invoice By Vendor  Mail Failed",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice Edited  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                                    error: null
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    invoiceRef: InvoiceId ? doc(db, "Invoice_Request", InvoiceId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }
            //create actionLogs
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: invoiceRef,
                old_data: {},
                edited_data: {},
                user_role,
                action: 903,
                message: `Invoice Edited by vendor Failed Successfull updated path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })

            res.status(200).json({
                success: true,
                message: "Invoice updated successfully",
            });
        } catch (error: any) {

            //create actionLogs
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: invoiceRef,
                old_data: {},
                edited_data: {},
                user_role,
                action: 903,
                message: `Invoice Edited by vendor Failed Error- ${error.message} updated path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })

            console.error("❌ Error updating invoice:", error);
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: " Edit Invoice By Vendor ",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            invoiceRef: InvoiceId ? doc(db, "Invoice_Request", InvoiceId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });
        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: " Edit Invoice By Vendor ",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        invoiceRef: InvoiceId ? doc(db, "Invoice_Request", InvoiceId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: "Failed to update invoice",
            error: e.message,
        })
    }
};

export const deputyInvoiceSendBack = async (req: Request, res: Response) => {
    const { feedback,
        invoiceId,
        user_id,
        user_role,
        platform,
        screen
    } = req.body;
    try {


        //update invoice
        const invoiceRef = doc(db, "Invoice_Request", invoiceId);
        const invoiceSnapshot = await getDoc(invoiceRef);
        if (!invoiceSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found",
            });
        }
        const invoiceData = invoiceSnapshot.data();
        try {

            await updateDoc(invoiceRef, {
                deputydirecotor: feedback,
                deputyDirector_status: 10,
                DateOfInvoice: serverTimestamp(),
                sendAgain: true,
            });
            const updatedData = (await getDoc(invoiceRef)).data();

            // create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: invoiceData || {},
                edited_data: updatedData || {},
                user_role,
                action: 10,
                message: `Invoice send Again Action successfull by Deputy updated Invoice Request document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })

            //update Advertisement document
            const adRef = invoiceData.advertiseRef;
            const adSnapshot = await getDoc(adRef);
            const addOldData = adSnapshot.data();
            await updateDoc(adRef, {
                Invoice_deputy: 3,
            });
            const updatedAdData = (await getDoc(adRef)).data();
            // create action log
            const actionLogAdd = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: addOldData || {},
                edited_data: updatedAdData || {},
                user_role,
                action: 6,
                message: `Invoice send Again Action successfull by Deputy updated Advertisement Document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogAdd })

            //send mail to vendor
            const userSnap = await getDoc(invoiceData.Userref);
            const userData = userSnap.data();
            if (!userData) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }
            const toMail = (userData && typeof userData === "object" && "email" in userData) ? (userData as any).email : "";
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/BillResubmittedDD`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: (userData && typeof userData === "object" && "email" in userData) ? (userData as any).email : "",
                        addressTo: (userData && typeof userData === "object" && "display_name" in userData) ? (userData as any).display_name : "",
                        // to: "jayanthbr@digi9.co.in",
                        roNumber: invoiceData.Ronumber,
                        vendorName: "Deputy Director",
                        vendorContact: (userData && typeof userData === "object" && "email" in userData) ? (userData as any).email : "",
                        reasonOfRejection: feedback
                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: invoiceData.jobref, // each allocation doc ref
                        ronumber: invoiceData.Ronumber,
                        docrefinvoice: invoiceRef,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice sendAgain mail sent successfully to vendor  ${toMail} path: /invoiceRequest${req.path}`,
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
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: invoiceData.jobref, // each allocation doc ref
                        ronumber: invoiceData.Ronumber,
                        docrefinvoice: invoiceRef,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice sendAgain  mail failed to send to vendor ${toMail} path: /invoiceRequest${req.path}`,
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
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: " Invoice send Again Action by Deputy ",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice sendAgain  mail failed to send to vendor ${toMail} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    invoiceRef: invoiceId ? doc(db, "Invoice_Request", invoiceId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }
            // create action log
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: {},
                edited_data: {},
                user_role,
                action: 205,
                message: `Invoice send Again Action by Deputy Successfull path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })

            res.status(200).json({
                success: true,
                message: "Invoice updated successfully",
            });

        } catch (error: any) {

            // create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: {},
                edited_data: {},
                user_role,
                action: 205,
                message: `Invoice send Again Action by Deputy Failed error: ${error.message} path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            console.error("❌ Error updating invoice:", error);
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: " Invoice send Again Action by Deputy ",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            invoiceRef: invoiceId ? doc(db, "Invoice_Request", invoiceId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });
        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: " Invoice send Again Action by Deputy ",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        invoiceRef: invoiceId ? doc(db, "Invoice_Request", invoiceId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: "Failed to update invoice",
            error: e.message,
        })
    }
};

export const deputyApproveInvoiceRequestPutUp = async (req: Request, res: Response) => {
    const {
        invoiceId,
        InvoiceUrl,
        user_id,
        user_role,
        platform,
        screen
    } = req.body;
    try {


        // fetch invoice
        const invoiceRef = doc(db, "Invoice_Request", invoiceId);
        const invoiceSnapshot = await getDoc(invoiceRef);
        if (!invoiceSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found",
            });
        }
        const invoiceData = invoiceSnapshot.data();
        try {
            //update invoice
            await updateDoc(invoiceRef, {
                Assitanttatus: 0,
                deputyDirector_status: 2,
                DateOfInvoice: serverTimestamp(),
                InvoiceUrl: InvoiceUrl,
            });
            const updatedData = (await getDoc(invoiceRef)).data();
            // create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: invoiceData || {},
                edited_data: updatedData || {},
                user_role,
                action: 10,
                message: `Invoice Request Approve - Put Up Action  by Deputy updated Invoice Request document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })


            //update Advertisement document
            const adRef = invoiceData.advertiseRef;
            const adSnapshot = await getDoc(adRef);
            const addOldData = adSnapshot.data();
            await updateDoc(adRef, {
                Invoice_Assistant: 1,
                Invoice_deputy: 0,
            });
            const updatedAdData = (await getDoc(adRef)).data();
            // create action log
            const actionLogAdd = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: addOldData || {},
                edited_data: updatedAdData || {},
                user_role,
                action: 6,
                message: `Invoice Request Approve - Put Up Action  by  Deputy updated Advertisement Document    path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogAdd })
            //send mail to Assistant Bill
            const userSnap = await getDoc(invoiceData.Userref);
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
            let toMail = null;

            switch ((userData && typeof userData === "object" && "display_name" in userData) ? (userData as any).display_name : "") {
                case "Arun Bhoomi":
                case "Eastern Sentinel":
                case "The Arunachal Times":
                case "The Arunachal Pioneer":
                case "The Dawn Lit Post":
                    toMail = usersEmailData["Idciprarungmailcom"];
                    break;
                case "Arunachal front":
                    toMail = usersEmailData["udciprgmailcom"];
                    break;
                default:
                    toMail = usersEmailData["udc2iprgmailcom"];
            }
            if (!toMail) {
                return res.status(404).json({
                    success: false,
                    message: "Email not found",
                });
            }
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/assistantBill`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMail,
                        addressTo: (userData && typeof userData === "object" && "display_name" in userData) ? (userData as any).display_name : "",
                        // to: "jayanthbr@digi9.co.in",
                        roNumber: invoiceData.Ronumber,
                        vendorName: "Deputy Director",
                        vendorContact: usersEmailData["ddipradvtgmailcom"],
                        resultComment: "put up"
                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: invoiceData.jobref, // each allocation doc ref
                        ronumber: invoiceData.Ronumber,
                        docrefinvoice: invoiceRef,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request put up Assistant Bill mail sent successfully to   ${toMail} path: /invoiceRequest${req.path}`,
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
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: invoiceData.jobref, // each allocation doc ref
                        ronumber: invoiceData.Ronumber,
                        docrefinvoice: invoiceRef,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice request put up Assistant Bill mail failed to send to  ${toMail} path: /invoiceRequest${req.path}`,
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
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: " Invoice Request Approve - Put Up Action  by Deputy Mail failed ",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice request put up Assistant Bill mail failed to send to  ${toMail} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    invoiceRef: invoiceId ? doc(db, "Invoice_Request", invoiceId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }

            // send mail to approve tds
            const toMail2 = (userData && typeof userData === "object" && "email" in userData) ? (userData as any).email : "";
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/approvedTDCase`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: (userData && typeof userData === "object" && "email" in userData) ? (userData as any).email : "",
                        addressTo: (userData && typeof userData === "object" && "display_name" in userData) ? (userData as any).display_name : "",
                        // to: "jayanthbr@digi9.co.in",
                        roNumber: invoiceData.Ronumber,
                        advertisementNumber: invoiceData.invoiceamount,
                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: invoiceData.jobref, // each allocation doc ref
                        ronumber: invoiceData.Ronumber,
                        docrefinvoice: invoiceRef,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request put up approvedTDCase mail sent successfully to   ${toMail2} path: /invoiceRequest${req.path}`,
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
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: invoiceData.jobref, // each allocation doc ref
                        ronumber: invoiceData.Ronumber,
                        docrefinvoice: invoiceRef,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice request put up approvedTDCase mail failed to send to  ${toMail2} path: /invoiceRequest${req.path}`,
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
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: " Invoice Request Approve - Put Up Action  by Deputy Mail failed ",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice request put up approvedTDCase mail failed to send to  ${toMail2} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    invoiceRef: invoiceId ? doc(db, "Invoice_Request", invoiceId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }

            // create action log
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: {},
                edited_data: {},
                user_role,
                action: 206,
                message: `Invoice Request Approve - Put Up Action  by Deputy Successfully path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })

            res.status(200).json({ success: true, message: "Invoice Request put up successfully" });

        } catch (error: Error | any) {
            // create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: {},
                edited_data: {},
                user_role,
                action: 206,
                message: `Invoice Request Approve - Put Up Action  by Deputy Failed error: ${error.message} path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            console.error("❌ Error updating invoice:", error);
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: " Invoice Request Approve - Put Up Action  by Deputy ",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error,
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            invoiceRef: invoiceId ? doc(db, "Invoice_Request", invoiceId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });
        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: " Invoice Request Approve - Put Up Action  by Deputy ",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e,
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        invoiceRef: invoiceId ? doc(db, "Invoice_Request", invoiceId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: "Failed to update invoice",
            error: e.message,
        })
    }
};

export const deputyApproveInvoiceRequestSendForward = async (req: Request, res: Response) => {
    const {
        invoiceId,
        InvoiceUrl,
        user_id,
        user_role,
        platform,
        screen
    } = req.body;
    // fetch invoice
    try {


        const invoiceRef = doc(db, "Invoice_Request", invoiceId);
        const invoiceSnapshot = await getDoc(invoiceRef);
        if (!invoiceSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found",
            });
        }
        const invoiceData = invoiceSnapshot.data();
        try {
            //update invoice
            await updateDoc(invoiceRef, {
                isSendForward: true,
                isCompleted: false,
                deputyDirector_status: 2,
                isRead: false,
                InvoiceUrl: InvoiceUrl
            });
            const updatedData = (await getDoc(invoiceRef)).data();
            // create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: invoiceData || {},
                edited_data: updatedData || {},
                user_role,
                action: 10,
                message: `Invoice Request Approve - Send Forward Action  by Deputy updated Invoice Request document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            const adRef = invoiceData.advertiseRef;

            //send mail to Assistant Bill
            const userSnap = await getDoc(invoiceData.Userref);
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
            let toMail = null;

            switch ((userData && typeof userData === "object" && "display_name" in userData) ? (userData as any).display_name : "") {
                case "Arun Bhoomi":
                case "Eastern Sentinel":
                case "The Arunachal Times":
                case "The Arunachal Pioneer":
                case "The Dawn Lit Post":
                    toMail = usersEmailData["Idciprarungmailcom"];
                    break;
                case "Arunachal front":
                    toMail = usersEmailData["udciprgmailcom"];
                    break;
                default:
                    toMail = usersEmailData["udc2iprgmailcom"];
            }
            if (!toMail) {
                return res.status(404).json({
                    success: false,
                    message: "Email not found",
                });
            }
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/assistantBill`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMail,
                        addressTo: (userData && typeof userData === "object" && "display_name" in userData) ? (userData as any).display_name : "",
                        // to: "jayanthbr@digi9.co.in",
                        roNumber: invoiceData.Ronumber,
                        vendorName: "Deputy Director",
                        vendorContact: usersEmailData["ddipradvtgmailcom"],
                        resultComment: "forwarded"
                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: invoiceData.jobref, // each allocation doc ref
                        ronumber: invoiceData.Ronumber,
                        docrefinvoice: invoiceRef,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request send Forward Assistant Bill mail sent successfully to   ${toMail} path: /invoiceRequest${req.path}`,
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
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: invoiceData.jobref, // each allocation doc ref
                        ronumber: invoiceData.Ronumber,
                        docrefinvoice: invoiceRef,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice request send Forward Assistant Bill mail failed to send to  ${toMail} path: /invoiceRequest${req.path}`,
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
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: " Invoice Request Approve - Send Forward Action  by Deputy Mail failed",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice request send Forward Assistant Bill mail failed to send to  ${toMail} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    invoiceRef: invoiceId ? doc(db, "Invoice_Request", invoiceId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }

            // send mail to approve tds
            const toMail2 = (userData && typeof userData === "object" && "email" in userData) ? (userData as any).email : "";
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/approvedTDCase`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: (userData && typeof userData === "object" && "email" in userData) ? (userData as any).email : "",
                        addressTo: (userData && typeof userData === "object" && "display_name" in userData) ? (userData as any).display_name : "",
                        // to: "jayanthbr@digi9.co.in",
                        roNumber: invoiceData.Ronumber,
                        advertisementNumber: invoiceData.invoiceamount,
                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: invoiceData.jobref, // each allocation doc ref
                        ronumber: invoiceData.Ronumber,
                        docrefinvoice: invoiceRef,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request send Forward approvedTDCase mail sent successfully to   ${toMail2} path: /invoiceRequest${req.path}`,
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
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: invoiceData.jobref, // each allocation doc ref
                        ronumber: invoiceData.Ronumber,
                        docrefinvoice: invoiceRef,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice request send Forward approvedTDCase mail failed to send to  ${toMail2} path: /invoiceRequest${req.path}`,
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
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: " Invoice Request Approve - Send Forward Action  by Deputy Mail failed",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice request send Forward approvedTDCase mail failed to send to  ${toMail2} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    invoiceRef: invoiceId ? doc(db, "Invoice_Request", invoiceId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }

            // create action log
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: {},
                edited_data: {},
                user_role,
                action: 207,
                message: `Invoice Request Approve - Send Forward Action  by Deputy Successfull path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })

            res.status(200).json({ success: true, message: "Invoice Request approve send forward successfully" });


        } catch (error: Error | any) {
            // create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: {},
                edited_data: {},
                user_role,
                action: 207,
                message: `Invoice Request Approve - Send Forward Action  by Deputy Failed path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            console.error("❌ Error updating invoice:", error);
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: " Invoice Request Approve - Send Forward Action  by Deputy",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error,
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            invoiceRef: invoiceId ? doc(db, "Invoice_Request", invoiceId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });
        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: " Invoice Request Approve - Send Forward Action  by Deputy",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e,
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        invoiceRef: invoiceId ? doc(db, "Invoice_Request", invoiceId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: "Failed to update invoice",
            error: e,
        })
    }
};

export const assistantApproveInvoiceRequest = async (req: Request, res: Response) => {
    const {
        invoiceId,
        user_id,
        user_role,
        platform,
        screen
    } = req.body;
    try {


        //get invoice data
        const invoiceRef = doc(db, "Invoice_Request", invoiceId);
        const invoiceSnapshot = await getDoc(invoiceRef);
        if (!invoiceSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found",
            });
        }
        const invoiceData = invoiceSnapshot.data();
        try {
            //update invoice
            await updateDoc(invoiceRef, {
                Assitanttatus: 2,
            });
            const updatedData = (await getDoc(invoiceRef)).data();
            // create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: invoiceData || {},
                edited_data: updatedData || {},
                user_role,
                action: 10,
                message: `Invoice Request Approve  by Assistant updated Invoice Request document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })


            //update Advertisement document
            const adRef = invoiceData.advertiseRef;
            const adSnapshot = await getDoc(adRef);
            const addOldData = adSnapshot.data();
            await updateDoc(adRef, {
                Invoice_Assistant: 1,
                Invoice_deputy: 0,
            });
            const updatedAdData = (await getDoc(adRef)).data();
            // create action log
            const actionLogAdd = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: addOldData || {},
                edited_data: updatedAdData || {},
                user_role,
                action: 6,
                message: `Invoice RequestApprove  by Assistant updated Advertisement Document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogAdd })

            //user collection Data
            const userRef = doc(db, "Users", user_id);
            const userSnapshot = await getDoc(userRef);
            const userData = userSnapshot.data();
            if (!userSnapshot.exists()) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }
            let approvedlist = [];
            if (userData && typeof userData === "object" && "approvedlist" in userData) {
                approvedlist = (userData as any).approvedlist;
            }
            approvedlist.push({
                adref: invoiceData.advertiseRef,
                id: invoiceData.Ronumber,
                date: invoiceData.DateOfInvoice,
                departmenttype: invoiceData.TypeOfDepartment,
                description: invoiceData.billno,
                invoiceref: invoiceRef,
                amount: invoiceData.invoiceamount,
                userrerf: invoiceData.Userref,
                billno: invoiceData.billno,
                billingaddress: invoiceData.billingAddress,
                deptName: invoiceData.DeptName

            });
            // update user collection
            await updateDoc(userRef, {
                approvedlist: approvedlist,
            });

            const updatedUserData = (await getDoc(userRef)).data();
            //create action log
            const actionLogUser = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: userData || {},
                edited_data: updatedUserData || {},
                user_role,
                action: 17,
                message: `Invoice RequestApprove  by Assistant updated User Document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });

            await addDoc(collection(db, "actionLogs"), { ...actionLogUser })
            // create action log
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: {},
                edited_data: {},
                user_role,
                action: 701,
                message: `Invoice Request Approve  by Assistant Successfull path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })
            res.status(200).json({ success: true, message: "Invoice Request approve by Assistant successfully" });


        } catch (error: Error | any) {
            // create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: {},
                edited_data: {},
                user_role,
                action: 701,
                message: `Invoice Request Approve  by Assistant Failed Error- ${error.message} path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            console.error("❌ Error updating invoice:", error);
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: " Invoice Request Approve  by Assistant",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error,
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            invoiceRef: invoiceId ? doc(db, "Invoice_Request", invoiceId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });

        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: " Invoice Request Approve  by Assistant",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e,
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        invoiceRef: invoiceId ? doc(db, "Invoice_Request", invoiceId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: "Failed to update invoice",
            error: e.message,
        })
    }
};

export const assistantSubmitInvoiceRequest = async (req: Request, res: Response) => {
    const {
        invoiceId,
        user_id,
        user_role,
        platform,
        screen
    } = req.body;

    try {



        //get invoice data
        const invoiceRef = doc(db, "Invoice_Request", invoiceId);
        const invoiceSnapshot = await getDoc(invoiceRef);
        if (!invoiceSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found",
            });
        }
        const invoiceData = invoiceSnapshot.data();
        try {
            //update invoice
            await updateDoc(invoiceRef, {
                isCompleted: true,
                isSendForward: false,
                isRead: false
            });
            const updatedData = (await getDoc(invoiceRef)).data();
            // create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: invoiceData || {},
                edited_data: updatedData || {},
                user_role,
                action: 10,
                message: `Invoice Request Submit  by Assistant updated Invoice Request document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })

            // create action log
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: {},
                edited_data: {},
                user_role,
                action: 703,
                message: `Invoice Request Submit  by Assistant Successfull path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })

            res.status(200).json({ success: true, message: "Invoice Request submit by Assistant successfully" });

        } catch (error: Error | any) {
            // create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: invoiceData.jobref,
                ronumber: invoiceData.Ronumber,
                docrefinvoice: invoiceRef,
                old_data: {},
                edited_data: {},
                user_role,
                action: 703,
                message: `Invoice Request Submit  by Assistant Failed Error- ${error.message} path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: invoiceData.advertiseRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                }
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            console.error("❌ Error updating invoice:", error);
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: " Invoice Request Submit  by Assistant",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error,
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            invoiceRef: invoiceId ? doc(db, "Invoice_Request", invoiceId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });
        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: " Invoice Request Submit  by Assistant",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e,
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        invoiceRef: invoiceId ? doc(db, "Invoice_Request", invoiceId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: "Failed to update invoice",
            error: e.message,
        });
    }
};

export const invoiceNoteSheetAcknowledgeDeputy = async (req: Request, res: Response) => {
    const {
        approvedAdId,
        FeedbackDeputy,
        user_id,
        user_role,
        platform,
        screen
    } = req.body
    try {
        //read document from user collection
        const userRef = doc(db, "Users", user_id)
        const userSnapshot = await getDoc(userRef)
        if (!userSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const userData = userSnapshot.data();
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        //read document from approve_add collection
        const approvedAdRef = doc(db, "approved_add", approvedAdId)
        try {

            const approvedAdSnapshot = await getDoc(approvedAdRef)
            if (!approvedAdSnapshot.exists()) {
                return res.status(404).json({
                    success: false,
                    message: "Approved Ad not found",
                });
            }
            const approvedAdData = approvedAdSnapshot.data();
            let notesheetdetails = approvedAdData.notesheetdetails || [];
            notesheetdetails.push(
                {
                    createddate: moment().tz("Asia/Kolkata").toDate(),
                    feedback: FeedbackDeputy,
                    userrole: userData.display_name
                }
            )

            //update approved_ad document
            await updateDoc(approvedAdRef, {
                deputyStatus: 2,
                FeedbackDeputy: FeedbackDeputy,
                ispending: true,
                dateofAproval: serverTimestamp(),
                directorStatus: 0,
                dateTimeDD: serverTimestamp(),
                assitantStattus: 3,
                notesheetdetails: notesheetdetails
            });
            const updatedData = (await getDoc(approvedAdRef)).data();

            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: approvedAdData || {},
                edited_data: updatedData || {},
                user_role,
                action: 12,
                message: `Invoice Request Approve  by Deputy updated approved add document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })

            //mail send to fao
            const usersEmailSnap = await getDocs(collection(db, "UsersEmail"));
            const userEmailDocSnap = usersEmailSnap.docs[0];
            if (!userEmailDocSnap) {
                throw new Error("UsersEmail document does not exist");
            }
            const usersEmailData = userEmailDocSnap.data();
            const toMail = usersEmailData["faoiprgmailcom"];
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/faoNotesheet`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMail,
                        // to: "jayanthbr@digi9.co.in",
                        notesheetNumber: approvedAdData.notesheetString,
                        amount: approvedAdData.TotalAmount,
                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Approve  by Deputy mail sent successfully to department  ${toMail} path: /invoiceRequest${req.path}`,
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
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Approve  by Deputy  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
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
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: "Invoice Request Approve  by Deputy mail failed",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice Request Approve  by Deputy  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }
            //create action log
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 203,
                message: `Invoice Request Approve  by Deputy Successfull path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })
            res.status(200).json({ success: true, message: "Invoice Request Approve  by Deputy successfully" });


        } catch (error: Error | any) {
            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 203,
                message: `Invoice Request Approve  by Deputy Failed Error: ${error.message} path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            console.error("❌ Error updating invoice:", error);
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: "Invoice Request Approve  by Deputy Failed",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error,
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });
        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: "Invoice Request Approve  by Deputy Failed",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e,
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: "Failed to update invoice",
            error: e.message,
        });
    }
};


export const invoiceNoteSheetAcknowledgeDirector = async (req: Request, res: Response) => {
    const {
        approvedAdId,
        feedbackDirector,
        user_id,
        user_role,
        platform,
        screen
    } = req.body
    try {

        //read document from user collection
        const userRef = doc(db, "Users", user_id)
        const userSnapshot = await getDoc(userRef)
        if (!userSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const userData = userSnapshot.data();
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        //read document from approve_add collection
        const approvedAdRef = doc(db, "approved_add", approvedAdId)
        try {

            const approvedAdSnapshot = await getDoc(approvedAdRef)
            if (!approvedAdSnapshot.exists()) {
                return res.status(404).json({
                    success: false,
                    message: "Approved Ad not found",
                });
            }
            const approvedAdData = approvedAdSnapshot.data();
            let notesheetdetails = approvedAdData.notesheetdetails || [];
            notesheetdetails.push(
                {
                    createddate: moment().tz("Asia/Kolkata").toDate(),
                    feedback: feedbackDirector,
                    userrole: userData.display_name
                }
            )

            //update approved_ad document
            await updateDoc(approvedAdRef, {
                directorStatus: 2,
                feedbackDirector: feedbackDirector,
                FaoStatus: 0,
                datetimeDirector: serverTimestamp(),
                dateofAproval: serverTimestamp(),
                datetimeSc: serverTimestamp(),
                notesheetdetails: notesheetdetails
            });
            const updatedData = (await getDoc(approvedAdRef)).data();

            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: approvedAdData || {},
                edited_data: updatedData || {},
                user_role,
                action: 12,
                message: `Invoice Request Approve  by FAO updated approved add document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })

            //mail send to department
            const usersEmailSnap = await getDocs(collection(db, "UsersEmail"));
            const userEmailDocSnap = usersEmailSnap.docs[0];
            if (!userEmailDocSnap) {
                throw new Error("UsersEmail document does not exist");
            }
            const usersEmailData = userEmailDocSnap.data();
            const toMail = usersEmailData["dyauniprgmailcom"];
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/directorNotesheet`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMail,
                        // to: "jayanthbr@digi9.co.in",
                        notesheetNumber: approvedAdData.notesheetString,
                        amount: approvedAdData.TotalAmount,
                        regardsFrom: "FAO",
                        addressTo: "Director",

                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Approve  by FAO mail sent successfully to department  ${toMail} path: /invoiceRequest${req.path}`,
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
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Approve  by FAO  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
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
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: "Invoice Request Approve  by FAO Mail Failed",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice Request Approve  by FAO  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }
            //create action log
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 300,
                message: `Invoice Request Approve  by FAO Successfull path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })

            res.status(200).json({ success: true, message: "Invoice Request Approve  by Director successfully" });


        } catch (error: Error | any) {
            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 300,
                message: `Invoice Request Approve  by FAO Failed Error: ${error.message} path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            console.error("❌ Error updating invoice:", error);
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: "Invoice Request Approve  by FAO",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error,
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });
        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: "Invoice Request Approve  by FAO",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e,
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: "Failed to update invoice",
            error: e.message,
        });
    }
};


export const invoiceNoteSheetAcknowledgeUnderSecratory = async (req: Request, res: Response) => {
    const {
        approvedAdId,
        feedbackUnderSecretary,
        user_id,
        user_role,
        platform,
        screen
    } = req.body
    try {


        //read document from user collection
        const userRef = doc(db, "Users", user_id)
        const userSnapshot = await getDoc(userRef)
        if (!userSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const userData = userSnapshot.data();
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        //read document from approve_add collection
        const approvedAdRef = doc(db, "approved_add", approvedAdId)
        try {

            const approvedAdSnapshot = await getDoc(approvedAdRef)
            if (!approvedAdSnapshot.exists()) {
                return res.status(404).json({
                    success: false,
                    message: "Approved Ad not found",
                });
            }
            const approvedAdData = approvedAdSnapshot.data();
            let notesheetdetails = approvedAdData.notesheetdetails || [];
            notesheetdetails.push(
                {
                    createddate: moment().tz("Asia/Kolkata").toDate(),
                    feedback: feedbackUnderSecretary,
                    userrole: userData.display_name
                }
            )

            //update approved_ad document
            await updateDoc(approvedAdRef, {
                ispending: true,
                isaprroved: false,
                dateofAproval: serverTimestamp(),
                statusUnderSecretary: 2,
                datetimeUnderSeceretary: serverTimestamp(),
                feedbackUnderSecretary: feedbackUnderSecretary,
                statusSecretary: 0,
                notesheetdetails: notesheetdetails
            });
            const updatedData = (await getDoc(approvedAdRef)).data();

            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: approvedAdData || {},
                edited_data: updatedData || {},
                user_role,
                action: 12,
                message: `Invoice Request Approve  by Under Secratory updated approved add document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })

            //mail send to department
            const usersEmailSnap = await getDocs(collection(db, "UsersEmail"));
            const userEmailDocSnap = usersEmailSnap.docs[0];
            if (!userEmailDocSnap) {
                throw new Error("UsersEmail document does not exist");
            }
            const usersEmailData = userEmailDocSnap.data();
            const toMail = usersEmailData["diprarunsecretarygmailcom"];
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/directorNotesheet`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMail,
                        // to: "jayanthbr@digi9.co.in",
                        notesheetNumber: approvedAdData.notesheetString,
                        amount: approvedAdData.TotalAmount,
                        regardsFrom: "UnderSecretary",
                        addressTo: "Secretary",

                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Approve  by Under Secratory mail sent successfully to department  ${toMail} path: /invoiceRequest${req.path}`,
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
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Approve  by Under Secratory  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
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
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: "Invoice Request Approve  by Under Secratory Mail Failed",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice Request Approve  by Under Secratory  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }
            //create action log
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 500,
                message: `Invoice Request Approve  by Under Secratory Successfull path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })

            res.status(200).json({ success: true, message: "Invoice Request Approve  by Under Secratory successfully" });


        } catch (error: Error | any) {
            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 500,
                message: `Invoice Request Approve  by Under Secratory Failed Error: ${error.message} path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            console.error("❌ Error updating invoice:", error);
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: "Invoice Request Approve  by Under Secratory",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error,
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });
        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: "Invoice Request Approve  by Under Secratory",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e,
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: "Failed to update invoice",
            error: e.message,
        });
    }
};


export const invoiceNoteSheetAcknowledgeIsSc = async (req: Request, res: Response) => {
    const {
        approvedAdId,
        feedbacksc,
        user_id,
        user_role,
        platform,
        screen
    } = req.body
    try {


        //read document from user collection
        const userRef = doc(db, "Users", user_id)
        const userSnapshot = await getDoc(userRef)
        if (!userSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const userData = userSnapshot.data();
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        //read document from approve_add collection
        const approvedAdRef = doc(db, "approved_add", approvedAdId)
        try {

            const approvedAdSnapshot = await getDoc(approvedAdRef)
            if (!approvedAdSnapshot.exists()) {
                return res.status(404).json({
                    success: false,
                    message: "Approved Ad not found",
                });
            }
            const approvedAdData = approvedAdSnapshot.data();
            let notesheetdetails = approvedAdData.notesheetdetails || [];
            notesheetdetails.push(
                {
                    createddate: moment().tz("Asia/Kolkata").toDate(),
                    feedback: feedbacksc,
                    userrole: userData.display_name
                }
            )

            //update approved_ad document
            await updateDoc(approvedAdRef, {
                statusSecretary: 2,
                feedbacksc: feedbacksc,
                ispending: false,
                isaprroved: true,
                dateofAproval: serverTimestamp(),
                FaoStatus: 5,
                accountant_status: 1,
                deputyStatus: 5,
                directorStatus: 5,
                datetimeSc: serverTimestamp(),
                assitantStattus: 5,
                statusUnderSecretary: 5,


                notesheetdetails: notesheetdetails
            });
            const updatedData = (await getDoc(approvedAdRef)).data();

            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: approvedAdData || {},
                edited_data: updatedData || {},
                user_role,
                action: 12,
                message: `Invoice Request Approve  by IsSc updated approved add document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })

            //read data from adminData and update budget
            const adminQuerySnap = await getDocs(collection(db, "admindata"));
            if (adminQuerySnap.empty) {
                return res.status(404).json({ success: false, message: "Admin not found" });
            }
            const adminSnapshot = adminQuerySnap.docs[0];
            if (!adminSnapshot) {
                return res.status(404).json({
                    success: false,
                    message: "Admin not found",
                });
            }
            const adminData = adminSnapshot.data();
            await updateDoc(doc(db, "admindata", adminSnapshot.id), {
                Budget: adminData.Budget - approvedAdData.TotalAmount
            })
            const updatedAdminData = (await getDoc(doc(db, "admindata", adminSnapshot.id))).data();
            //create acion log
            const actionLogAdmin = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: adminData || {},
                edited_data: updatedAdminData || {},
                user_role,
                action: 15,
                message: `Invoice Request Approve  by IsSc updated admindata document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogAdmin })

            //mail send to department - approvedTFao
            const usersEmailSnap = await getDocs(collection(db, "UsersEmail"));
            const userEmailDocSnap = usersEmailSnap.docs[0];
            if (!userEmailDocSnap) {
                throw new Error("UsersEmail document does not exist");
            }
            const usersEmailData = userEmailDocSnap.data();
            const toMail = usersEmailData["undersecretaryiprgmailcom"];
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/approvedTFao`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMail,
                        // to: "jayanthbr@digi9.co.in",
                        notesheetNumber: approvedAdData.notesheetString,
                        amount: approvedAdData.TotalAmount,
                        cc: "dyauniprgmailcom,faoiprgmailcom"

                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Approve  by IsSc mail sent successfully to department  ${toMail} path: /invoiceRequest${req.path}`,
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
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Approve  by IsSc  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
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
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: "Invoice Request Approve  by IsSc Mail Failed",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice Request Approve  by IsSc  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }
            // second mail send to department - approvedTFao
            let toMailTwo = '';
            switch ((userData && typeof userData === "object" && "display_name" in userData) ? (userData as any).display_name : "") {
                case "Arun Bhoomi":
                case "Eastern Sentinel":
                case "The Arunachal Times":
                case "The Arunachal Pioneer":
                case "The Dawn Lit Post":
                    toMailTwo = usersEmailData["Idciprarungmailcom"];
                    break;
                case "Arunachal front":
                    toMailTwo = usersEmailData["udciprgmailcom"];
                    break;
                default:
                    toMailTwo = usersEmailData["udc2iprgmailcom"];
            }
            if (!toMailTwo) {
                return res.status(404).json({
                    success: false,
                    message: "Email not found",
                });
            }
            // const toMailTwo = usersEmailData["undersecretaryiprgmailcom"];
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/uploadSanction`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMailTwo,
                        // to: "jayanthbr@digi9.co.in",
                        notesheetNumber: approvedAdData.notesheetString,

                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Approve  by IsSc mail sent successfully to department  ${toMailTwo} path: /invoiceRequest${req.path}`,
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
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Approve  by IsSc  mail failed to send to department ${toMailTwo} path: /invoiceRequest${req.path}`,
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
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: "Invoice Request Approve  by IsSc Mail Failed",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice Request Approve  by IsSc  mail failed to send to department ${toMailTwo} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }

            //create action log
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 600,
                message: `Invoice Request Approve  by IsSc successfull path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })

            res.status(200).json({ success: true, message: "Invoice Request Approve  by IsSc successfully" });


        } catch (error: Error | any) {
            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 600,
                message: `Invoice Request Approve  by IsSc Failed Error: ${error.message} path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: req.ip || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            console.error("❌ Error updating invoice:", error);
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: "Invoice Request Approve  by IsSc",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error,
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });
        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: "Invoice Request Approve  by IsSc",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e,
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: "Failed to update invoice",
            error: e.message,
        });
    }
};

export const invoiceNoteSheetRejectDeputy = async (req: Request, res: Response) => {
    const {
        approvedAdId,
        FeedbackDeputy,
        user_id,
        user_role,
        platform,
        screen
    } = req.body
    try {


        // console.dir(req.body, { depth: null });
        const xForwardedFor = req.headers["x-forwarded-for"];
        const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
        //read document from user collection
        const userRef = doc(db, "Users", user_id)
        const userSnapshot = await getDoc(userRef)
        if (!userSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const userData = userSnapshot.data();
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        //read document from approve_add collection
        const approvedAdRef = doc(db, "approved_add", approvedAdId)
        try {

            const approvedAdSnapshot = await getDoc(approvedAdRef)
            if (!approvedAdSnapshot.exists()) {
                return res.status(404).json({
                    success: false,
                    message: "Approved Ad not found",
                });
            }
            const approvedAdData = approvedAdSnapshot.data();
            let notesheetdetails = approvedAdData.notesheetdetails || [];
            notesheetdetails.push(
                {
                    createddate: moment().tz("Asia/Kolkata").toDate(),
                    feedback: FeedbackDeputy,
                    userrole: userData.display_name
                }
            )

            //update approved_ad document
            await updateDoc(approvedAdRef, {
                deputyStatus: 0,
                FeedbackDeputy: FeedbackDeputy,
                dateofAproval: serverTimestamp(),
                dateTimeDD: serverTimestamp(),
                ispending: false,
                assitantStattus: 1,
                notesheetdetails: notesheetdetails
            });
            const updatedData = (await getDoc(approvedAdRef)).data();

            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: approvedAdData || {},
                edited_data: updatedData || {},
                user_role,
                action: 12,
                message: `Invoice Request Reject  by Deputy updated approved add document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })

            //mail send to fao
            const usersEmailSnap = await getDocs(collection(db, "UsersEmail"));
            const userEmailDocSnap = usersEmailSnap.docs[0];
            if (!userEmailDocSnap) {
                throw new Error("UsersEmail document does not exist");
            }
            const usersEmailData = userEmailDocSnap.data();
            let toMail = '';
            switch ((userData && typeof userData === "object" && "display_name" in userData) ? (userData as any).display_name : "") {
                case "Arun Bhoomi":
                case "Eastern Sentinel":
                case "The Arunachal Times":
                case "The Arunachal Pioneer":
                case "The Dawn Lit Post":
                    toMail = usersEmailData["Idciprarungmailcom"];
                    break;
                case "Arunachal front":
                    toMail = usersEmailData["udciprgmailcom"];
                    break;
                default:
                    toMail = usersEmailData["udc2iprgmailcom"];
            }
            if (!toMail) {
                return res.status(404).json({
                    success: false,
                    message: "Email not found",
                });
            }
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/notesheetRejected`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMail,
                        // to: "jayanthbr@digi9.co.in",
                        notesheetNumber: approvedAdData.notesheetString,
                        addressTo: "Deputy Director"
                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Rejeted  by Deputy mail sent successfully to department  ${toMail} path: /invoiceRequest${req.path}`,
                        status: "Success",
                        platform: platform,
                        networkip: clientIp || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Reject  by Deputy  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                        status: "Failed",
                        platform: platform,
                        networkip: clientIp || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: "Invoice Request Reject  by Deputy",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice Request Reject  by Deputy  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }
            //create action log
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 204,
                message: `Invoice Request Reject  by Deputy Successfully path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })
            res.status(200).json({ success: true, message: "Invoice Reject Approve  by Deputy successfully" });


        } catch (error: Error | any) {
            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 204,
                message: `Invoice Request Reject  by Deputy Failed Error: ${error.message} path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            console.error("❌ Error updating invoice:", error);
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: "Invoice Request Reject  by Deputy",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error,
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });
        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: "Invoice Request Reject  by Deputy",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e,
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: "Failed to update invoice",
            error: e.message,
        });
    }
};

export const invoiceNoteSheetRejectDirector = async (req: Request, res: Response) => {
    const {
        approvedAdId,
        feedbackDirector,
        user_id,
        user_role,
        platform,
        screen
    } = req.body
    try {


        const xForwardedFor = req.headers["x-forwarded-for"];
        const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
        //read document from user collection
        const userRef = doc(db, "Users", user_id)
        const userSnapshot = await getDoc(userRef)
        if (!userSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const userData = userSnapshot.data();
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        //read document from approve_add collection
        const approvedAdRef = doc(db, "approved_add", approvedAdId)
        try {

            const approvedAdSnapshot = await getDoc(approvedAdRef)
            if (!approvedAdSnapshot.exists()) {
                return res.status(404).json({
                    success: false,
                    message: "Approved Ad not found",
                });
            }
            const approvedAdData = approvedAdSnapshot.data();
            let notesheetdetails = approvedAdData.notesheetdetails || [];
            notesheetdetails.push(
                {
                    createddate: moment().tz("Asia/Kolkata").toDate(),
                    feedback: feedbackDirector,
                    userrole: userData.display_name
                }
            )

            //update approved_ad document
            await updateDoc(approvedAdRef, {
                directorStatus: 10,
                feedbackDirector: feedbackDirector,
                dateofAproval: serverTimestamp(),
                datetimeDirector: serverTimestamp(),
                deputyStatus: 0,
                ispending: false,
                assitantStattus: 1,
                notesheetdetails: notesheetdetails
            });
            const updatedData = (await getDoc(approvedAdRef)).data();

            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: approvedAdData || {},
                edited_data: updatedData || {},
                user_role,
                action: 10,
                message: `Invoice Request Reject  by FAO updated approved add document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })

            //mail send to department
            const usersEmailSnap = await getDocs(collection(db, "UsersEmail"));
            const userEmailDocSnap = usersEmailSnap.docs[0];
            if (!userEmailDocSnap) {
                throw new Error("UsersEmail document does not exist");
            }
            const usersEmailData = userEmailDocSnap.data();
            let toMail = '';
            switch ((userData && typeof userData === "object" && "display_name" in userData) ? (userData as any).display_name : "") {
                case "Arun Bhoomi":
                case "Eastern Sentinel":
                case "The Arunachal Times":
                case "The Arunachal Pioneer":
                case "The Dawn Lit Post":
                    toMail = usersEmailData["Idciprarungmailcom"];
                    break;
                case "Arunachal front":
                    toMail = usersEmailData["udciprgmailcom"];
                    break;
                default:
                    toMail = usersEmailData["udc2iprgmailcom"];
            }
            if (!toMail) {
                return res.status(404).json({
                    success: false,
                    message: "Email not found",
                });
            }
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/notesheetRejected`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMail,
                        // to: "jayanthbr@digi9.co.in",
                        notesheetNumber: approvedAdData.notesheetString,
                        cc: usersEmailData["ddipradvtgmailcom"],
                        addressTo: "FAO",

                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Reject  by FAO mail sent successfully to department  ${toMail} path: /invoiceRequest${req.path}`,
                        status: "Success",
                        platform: platform,
                        networkip: clientIp || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Reject  by FAO  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                        status: "Failed",
                        platform: platform,
                        networkip: clientIp || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: "Invoice Request Reject  by FAO Mail Failed ",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice Request Reject  by FAO  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }
            //create action log
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 301,
                message: `Invoice Request Reject  by FAO Successfull path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })

            res.status(200).json({ success: true, message: "Invoice Request Reject  by FAO successfully" });


        } catch (error: Error | any) {
            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 301,
                message: `Invoice Request Reject  by FAO Failed Error: ${error.message} path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            console.error("❌ Error updating invoice:", error);
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: "Invoice Request Reject  by FAO ",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error,
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });
        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: "Invoice Request Reject  by FAO ",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e,
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: "Failed to update invoice",
            error: e.message,
        });
    }
};

export const invoiceNoteSheetRejectUnderSecratory = async (req: Request, res: Response) => {
    const {
        approvedAdId,
        feedbackUnderSecretary,
        user_id,
        user_role,
        platform,
        screen
    } = req.body
    try {


        const xForwardedFor = req.headers["x-forwarded-for"];
        const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
        //read document from user collection
        const userRef = doc(db, "Users", user_id)
        const userSnapshot = await getDoc(userRef)
        if (!userSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const userData = userSnapshot.data();
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        //read document from approve_add collection
        const approvedAdRef = doc(db, "approved_add", approvedAdId)
        try {

            const approvedAdSnapshot = await getDoc(approvedAdRef)
            if (!approvedAdSnapshot.exists()) {
                return res.status(404).json({
                    success: false,
                    message: "Approved Ad not found",
                });
            }
            const approvedAdData = approvedAdSnapshot.data();
            let notesheetdetails = approvedAdData.notesheetdetails || [];
            notesheetdetails.push(
                {
                    createddate: moment().tz("Asia/Kolkata").toDate(),
                    feedback: feedbackUnderSecretary,
                    userrole: userData.display_name
                }
            )

            //update approved_ad document
            await updateDoc(approvedAdRef, {
                deputyStatus: 0,
                directorStatus: 10,
                FaoStatus: 10,
                ispending: false,
                assitantStattus: 1,
                statusUnderSecretary: 10,
                datetimeUnderSeceretary: serverTimestamp(),
                feedbackUnderSecretary: feedbackUnderSecretary,
                notesheetdetails: notesheetdetails
            });
            const updatedData = (await getDoc(approvedAdRef)).data();

            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: approvedAdData || {},
                edited_data: updatedData || {},
                user_role,
                action: 12,
                message: `Invoice Request Reject  by Under Secratory updated approved add document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })

            //mail send to department
            const usersEmailSnap = await getDocs(collection(db, "UsersEmail"));
            const userEmailDocSnap = usersEmailSnap.docs[0];
            if (!userEmailDocSnap) {
                throw new Error("UsersEmail document does not exist");
            }
            const usersEmailData = userEmailDocSnap.data();
            const toMail = usersEmailData["dyauniprgmailcom"];
            let thirdCC = ``;
            switch ((userData && typeof userData === "object" && "display_name" in userData) ? (userData as any).display_name : "") {
                case "Arun Bhoomi":
                case "Eastern Sentinel":
                case "The Arunachal Times":
                case "The Arunachal Pioneer":
                case "The Dawn Lit Post":
                    thirdCC = usersEmailData["Idciprarungmailcom"];
                    break;
                case "Arunachal front":
                    thirdCC = usersEmailData["udciprgmailcom"];
                    break;
                default:
                    thirdCC = usersEmailData["udc2iprgmailcom"];
            }
            if (!thirdCC) {
                return res.status(404).json({
                    success: false,
                    message: "Email not found",
                });
            }
            const cc = `${usersEmailData["faoiprgmailcom"]},${usersEmailData["ddipradvtgmailcom"]},${thirdCC}`;
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/notesheetRejected`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMail,
                        // to: "jayanthbr@digi9.co.in",
                        notesheetNumber: approvedAdData.notesheetString,
                        cc: cc,
                        addressTo: "UnderSecretary",

                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Reject  by Under Secratory mail sent successfully to department  ${toMail} path: /invoiceRequest${req.path}`,
                        status: "Success",
                        platform: platform,
                        networkip: clientIp || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Reject  by Under Secratory  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                        status: "Failed",
                        platform: platform,
                        networkip: clientIp || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: "Invoice Request Reject  by Under Secratory Mail Failed",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice Request Reject  by Under Secratory  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }
            //create action log
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 501,
                message: `Invoice Request Reject  by Under Secratory Successfull path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })

            res.status(200).json({ success: true, message: "Invoice Request Reject  by Under Secratory successfully" });


        } catch (error: Error | any) {
            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 501,
                message: `Invoice Request Reject  by Under Secratory Failed Error: ${error.message} path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            console.error("❌ Error updating invoice:", error);
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: "Invoice Request Reject  by Under Secratory ",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error,
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });
        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: "Invoice Request Reject  by Under Secratory ",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e,
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: "Failed to update invoice",
            error: e.message,
        });
    }
};

export const invoiceNoteSheetRejectIsSc = async (req: Request, res: Response) => {
    const {
        approvedAdId,
        feedbacksc,
        user_id,
        user_role,
        platform,
        screen
    } = req.body
    try {



        const xForwardedFor = req.headers["x-forwarded-for"];
        const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
        //read document from user collection
        const userRef = doc(db, "Users", user_id)
        const userSnapshot = await getDoc(userRef)
        if (!userSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const userData = userSnapshot.data();
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        //read document from approve_add collection
        const approvedAdRef = doc(db, "approved_add", approvedAdId)
        try {

            const approvedAdSnapshot = await getDoc(approvedAdRef)
            if (!approvedAdSnapshot.exists()) {
                return res.status(404).json({
                    success: false,
                    message: "Approved Ad not found",
                });
            }
            const approvedAdData = approvedAdSnapshot.data();
            let notesheetdetails = approvedAdData.notesheetdetails || [];
            notesheetdetails.push(
                {
                    createddate: moment().tz("Asia/Kolkata").toDate(),
                    feedback: feedbacksc,
                    userrole: userData.display_name
                }
            )

            //update approved_ad document
            await updateDoc(approvedAdRef, {
                statusSecretary: 10,
                feedbacksc: feedbacksc,
                dateofAproval: serverTimestamp(),
                datetimeSc: serverTimestamp(),
                deputyStatus: 0,
                directorStatus: 10,
                FaoStatus: 10,
                ispending: false,
                assitantStattus: 1,
                statusUnderSecretary: 10,
                notesheetdetails: notesheetdetails
            });
            const updatedData = (await getDoc(approvedAdRef)).data();

            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: approvedAdData || {},
                edited_data: updatedData || {},
                user_role,
                action: 12,
                message: `Invoice Request Reject  by IsSc updated approved add document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })


            //mail send to department - approvedTFao
            const usersEmailSnap = await getDocs(collection(db, "UsersEmail"));
            const userEmailDocSnap = usersEmailSnap.docs[0];
            if (!userEmailDocSnap) {
                throw new Error("UsersEmail document does not exist");
            }
            const usersEmailData = userEmailDocSnap.data();
            const toMail = usersEmailData["undersecretaryiprgmailcom"];
            let thirdCC = ``;
            switch ((userData && typeof userData === "object" && "display_name" in userData) ? (userData as any).display_name : "") {
                case "Arun Bhoomi":
                case "Eastern Sentinel":
                case "The Arunachal Times":
                case "The Arunachal Pioneer":
                case "The Dawn Lit Post":
                    thirdCC = usersEmailData["Idciprarungmailcom"];
                    break;
                case "Arunachal front":
                    thirdCC = usersEmailData["udciprgmailcom"];
                    break;
                default:
                    thirdCC = usersEmailData["udc2iprgmailcom"];
            }
            if (!thirdCC) {
                return res.status(404).json({
                    success: false,
                    message: "Email not found",
                });
            }
            const cc = `${usersEmailData["faoiprgmailcom"]},${usersEmailData["ddipradvtgmailcom"]},${usersEmailData["dyauniprgmailcom"]},${thirdCC}`;
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/notesheetRejected`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMail,
                        // to: "jayanthbr@digi9.co.in",
                        notesheetNumber: approvedAdData.notesheetString,
                        cc: cc,
                        addressTo: "Secretary"

                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Reject  by IsSc mail sent successfully to department  ${toMail} path: /invoiceRequest${req.path}`,
                        status: "Success",
                        platform: platform,
                        networkip: clientIp || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Reject  by IsSc  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                        status: "Failed",
                        platform: platform,
                        networkip: clientIp || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: "Invoice Request Reject  by IsSc Mail failed",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice Request Reject  by IsSc  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }
            //create action log
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 601,
                message: `Invoice Request Reject  by IsSc successfull path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })

            res.status(200).json({ success: true, message: "Invoice Request Rejected  by IsSc successfully" });


        } catch (error: Error | any) {
            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 601,
                message: `Invoice Request Reject  by IsSc Failed Error: ${error.message} path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            console.error("❌ Error updating invoice:", error);
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: "Invoice Request Reject  by IsSc ",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error,
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });
        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: "Invoice Request Reject  by IsSc ",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e,
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: e.message,
            error: e,
        });
    }
};


export const invoiceNoteSheetRejectFao = async (req: Request, res: Response) => {
    const {
        approvedAdId,
        feedbackFao,
        user_id,
        user_role,
        platform,
        screen
    } = req.body
    try {



        const xForwardedFor = req.headers["x-forwarded-for"];
        const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
        //read document from user collection
        const userRef = doc(db, "Users", user_id)
        const userSnapshot = await getDoc(userRef)
        if (!userSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const userData = userSnapshot.data();
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        //read document from approve_add collection
        const approvedAdRef = doc(db, "approved_add", approvedAdId)
        try {

            const approvedAdSnapshot = await getDoc(approvedAdRef)
            if (!approvedAdSnapshot.exists()) {
                return res.status(404).json({
                    success: false,
                    message: "Approved Ad not found",
                });
            }
            const approvedAdData = approvedAdSnapshot.data();
            let notesheetdetails = approvedAdData.notesheetdetails || [];
            notesheetdetails.push(
                {
                    createddate: moment().tz("Asia/Kolkata").toDate(),
                    feedback: feedbackFao,
                    userrole: userData.display_name
                }
            )

            //update approved_ad document
            await updateDoc(approvedAdRef, {
                FaoStatus: 10,
                feedbackFao: feedbackFao,
                dateofAproval: serverTimestamp(),
                datetimeFao: serverTimestamp(),
                deputyStatus: 0,
                directorStatus: 10,
                assitantStattus: 1,
                notesheetdetails: notesheetdetails
            });
            const updatedData = (await getDoc(approvedAdRef)).data();

            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: approvedAdData || {},
                edited_data: updatedData || {},
                user_role,
                action: 12,
                message: `Invoice Request Reject  by Director updated approved add document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })



            //mail send to department - approvedTFao
            const usersEmailSnap = await getDocs(collection(db, "UsersEmail"));
            const userEmailDocSnap = usersEmailSnap.docs[0];
            if (!userEmailDocSnap) {
                throw new Error("UsersEmail document does not exist");
            }
            const usersEmailData = userEmailDocSnap.data();
            const toMail = usersEmailData["faoiprgmailcom"];
            let thirdCC = ``;
            switch ((userData && typeof userData === "object" && "display_name" in userData) ? (userData as any).display_name : "") {
                case "Arun Bhoomi":
                case "Eastern Sentinel":
                case "The Arunachal Times":
                case "The Arunachal Pioneer":
                case "The Dawn Lit Post":
                    thirdCC = usersEmailData["Idciprarungmailcom"];
                    break;
                case "Arunachal front":
                    thirdCC = usersEmailData["udciprgmailcom"];
                    break;
                default:
                    thirdCC = usersEmailData["udc2iprgmailcom"];
            }
            if (!thirdCC) {
                return res.status(404).json({
                    success: false,
                    message: "Email not found",
                });
            }
            const cc = `${usersEmailData["ddipradvtgmailcom"]},${thirdCC}`;
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/notesheetRejected`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMail,
                        // to: "jayanthbr@digi9.co.in",
                        notesheetNumber: approvedAdData.notesheetString,
                        cc: cc,
                        addressTo: "Director"

                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Reject  by Director mail sent successfully to department  ${toMail} path: /invoiceRequest${req.path}`,
                        status: "Success",
                        platform: platform,
                        networkip: clientIp || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Reject  by Director  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                        status: "Failed",
                        platform: platform,
                        networkip: clientIp || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: "Invoice Request Reject  by Director Mail failed",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice Request Reject  by Director  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }

            //create action log
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 400,
                message: `Invoice Request Reject  by Director Successfull  path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })

            res.status(200).json({ success: true, message: "Invoice Request Rejected  by FAO successfully" });


        } catch (error: Error | any) {
            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 400,
                message: `Invoice Request Reject  by Director Failed Error: ${error.message} path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            console.error("❌ Error updating invoice:", error);
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: "Invoice Request Reject  by Director ",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error,
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });
        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: "Invoice Request Reject  by Director ",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e,
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: e.message,
            error: e,
        });
    }
};

export const invoiceNoteSheetAcknowledgeFAOForLDCUDC = async (req: Request, res: Response) => {
    const {
        approvedAdId,
        user_id,
        user_role,
        platform,
        screen
    } = req.body
    try {



        const xForwardedFor = req.headers["x-forwarded-for"];
        const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
        //read document from user collection
        const userRef = doc(db, "Users", user_id)
        const userSnapshot = await getDoc(userRef)
        if (!userSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const userData = userSnapshot.data();
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        //read document from approve_add collection
        const approvedAdRef = doc(db, "approved_add", approvedAdId)
        try {

            const approvedAdSnapshot = await getDoc(approvedAdRef)
            if (!approvedAdSnapshot.exists()) {
                return res.status(404).json({
                    success: false,
                    message: "Approved Ad not found",
                });
            }
            const approvedAdData = approvedAdSnapshot.data();


            //update approved_ad document
            await updateDoc(approvedAdRef, {
                isaprroved: true,
                deputyStatus: 5,
                directorStatus: 5,
                FaoStatus: 5,
                accountant_status: 1,
                ispending: false,
                assitantStattus: 5,
                dateofAproval: serverTimestamp()
            });
            const updatedData = (await getDoc(approvedAdRef)).data();

            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: approvedAdData || {},
                edited_data: updatedData || {},
                user_role,
                action: 12,
                message: `Invoice Request Approve  by Director for selecting LDC/UDC updated approved add document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })


            //read data from adminData and update budget
            const adminQuerySnap = await getDocs(collection(db, "admindata"));
            if (adminQuerySnap.empty) {
                return res.status(404).json({ success: false, message: "Admin not found" });
            }
            const adminSnapshot = adminQuerySnap.docs[0];
            if (!adminSnapshot) {
                return res.status(404).json({
                    success: false,
                    message: "Admin not found",
                });
            }
            const adminData = adminSnapshot.data();
            await updateDoc(doc(db, "admindata", adminSnapshot.id), {
                Budget: adminData.Budget - approvedAdData.TotalAmount
            })
            const updatedAdminData = (await getDoc(doc(db, "admindata", adminSnapshot.id))).data();
            //create acion log
            const actionLogAdmin = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: adminData || {},
                edited_data: updatedAdminData || {},
                user_role,
                action: 15,
                message: `Invoice Request Approve  by Director for selecting LDC/UDC updated admindata document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogAdmin })

            //mail send to uploadSanction
            const usersEmailSnap = await getDocs(collection(db, "UsersEmail"));
            const userEmailDocSnap = usersEmailSnap.docs[0];
            if (!userEmailDocSnap) {
                throw new Error("UsersEmail document does not exist");
            }
            const usersEmailData = userEmailDocSnap.data();
            let toMail = ``;
            switch ((userData && typeof userData === "object" && "display_name" in userData) ? (userData as any).display_name : "") {
                case "Arun Bhoomi":
                case "Eastern Sentinel":
                case "The Arunachal Times":
                case "The Arunachal Pioneer":
                case "The Dawn Lit Post":
                    toMail = usersEmailData["Idciprarungmailcom"];
                    break;
                case "Arunachal front":
                    toMail = usersEmailData["udciprgmailcom"];
                    break;
                default:
                    toMail = usersEmailData["udc2iprgmailcom"];
            }
            if (!toMail) {
                return res.status(404).json({
                    success: false,
                    message: "Email not found",
                });
            }
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/uploadSanction`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMail,
                        // to: "jayanthbr@digi9.co.in",
                        notesheetNumber: approvedAdData.notesheetString,
                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Approve  by Director for selecting LDC/UDC mail sent successfully to department  ${toMail} path: /invoiceRequest${req.path}`,
                        status: "Success",
                        platform: platform,
                        networkip: clientIp || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Approve  by Director for selecting LDC/UDC  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                        status: "Failed",
                        platform: platform,
                        networkip: clientIp || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: "IInvoice Request Approve  by Director for selecting LDC/UDC  Mail failed",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice Request Approve  by Director for selecting LDC/UDC  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                                    status: "Failed",
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }

            //send mail to acceptthreefive
            let toMailTwo = usersEmailData["faoiprgmailcom"];
            const cc = usersEmailData["ddipradvtgmailcom"];
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/accept35`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMailTwo,
                        // to: "jayanthbr@digi9.co.in",
                        notesheetNumber: approvedAdData.notesheetString,
                        addressTo: "FAO",
                        result: "accepted.",
                        cc: cc,
                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Approve  by Director for selecting LDC/UDC mail sent successfully to department  ${toMailTwo} path: /invoiceRequest${req.path}`,
                        status: "Success",
                        platform: platform,
                        networkip: clientIp || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Approve  by Director for selecting LDC/UDC  mail failed to send to department ${toMailTwo} path: /invoiceRequest${req.path}`,
                        status: "Failed",
                        platform: platform,
                        networkip: clientIp || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: "Invoice Request Approve  by Director for selecting LDC/UDC  Mail failed",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice Request Approve  by Director for selecting LDC/UDC  mail failed to send to department ${toMailTwo} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }
            //create action log
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 401,
                message: `Invoice Request Approve  by Director for selecting LDC/UDC Successfull path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })

            res.status(200).json({ success: true, message: "Invoice Request Approve  by Director for selecting LDC/UDC successfully" });


        } catch (error: Error | any) {
            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 401,
                message: `Invoice Request Approve  by Director for selecting LDC/UDC Failed Error: ${error.message} path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            console.error("❌ Error updating invoice:", error);

            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: "IInvoice Request Approve  by Director for selecting LDC/UDC ",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error,
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });
        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: "IInvoice Request Approve  by Director for selecting LDC/UDC ",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e,
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: e.message,
            error: e,
        });
    }
};


export const invoiceNoteSheetAcknowledgeFAOForUnderSecretary = async (req: Request, res: Response) => {
    const {
        approvedAdId,
        user_id,
        user_role,
        platform,
        screen
    } = req.body
    try {


        const xForwardedFor = req.headers["x-forwarded-for"];
        const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
        //read document from user collection
        const userRef = doc(db, "Users", user_id)
        const userSnapshot = await getDoc(userRef)
        if (!userSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const userData = userSnapshot.data();
        if (!userData) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        //read document from approve_add collection
        const approvedAdRef = doc(db, "approved_add", approvedAdId)
        try {

            const approvedAdSnapshot = await getDoc(approvedAdRef)
            if (!approvedAdSnapshot.exists()) {
                return res.status(404).json({
                    success: false,
                    message: "Approved Ad not found",
                });
            }
            const approvedAdData = approvedAdSnapshot.data();


            //update approved_ad document
            await updateDoc(approvedAdRef, {
                FaoStatus: 2,
                statusUnderSecretary: 0,

            });
            const updatedData = (await getDoc(approvedAdRef)).data();

            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: approvedAdData || {},
                edited_data: updatedData || {},
                user_role,
                action: 12,
                message: `Invoice Request Approve  by Director for selecting Undersecretary updated approved add document path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })




            //mail send to uploadSanction
            const usersEmailSnap = await getDocs(collection(db, "UsersEmail"));
            const userEmailDocSnap = usersEmailSnap.docs[0];
            if (!userEmailDocSnap) {
                throw new Error("UsersEmail document does not exist");
            }
            const usersEmailData = userEmailDocSnap.data();
            let toMail = usersEmailData["undersecretaryiprgmailcom"];

            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/directorNotesheet`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: toMail,
                        // to: "jayanthbr@digi9.co.in",
                        notesheetNumber: approvedAdData.notesheetString,
                        amount: approvedAdData.TotalAmount,
                        regardsFrom: "Director",
                        addressTo: "UnderSecretary",

                    }),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Approve  by Director for selecting Undersecretary mail sent successfully to department  ${toMail} path: /invoiceRequest${req.path}`,
                        status: "Success",
                        platform: platform,
                        networkip: clientIp || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                } else {
                    const actionLog = new ActionLog({
                        user_ref: user_id ? doc(db, "Users", user_id) : null,
                        islogin: false,
                        rodocref: null, // each allocation doc ref
                        ronumber: null,
                        docrefinvoice: null,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Invoice Request Approve  by Director for selecting Undersecretary  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                        status: "Failed",
                        platform: platform,
                        networkip: clientIp || null,
                        screen,
                        Newspaper_allocation: {
                            Newspaper: [],
                            allotedtime: null,
                            allocation_type: null,
                            allotedby: null,
                        },
                        adRef: null,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                        note_sheet_allocation: approvedAdRef || null,
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                    try {
                        const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                to: process.env.FAILED_LOG_TO_MAIL,
                                cc: process.env.FAILED_LOG_CC_MAIL,
                                actionName: "Invoice Request Approve  by Director for selecting Undersecretary Mail Failed",
                                actionEndpoint: `/invoiceRequest${req.path}`,
                                ErrorInfo: {
                                    message: `Invoice Request Approve  by Director for selecting Undersecretary  mail failed to send to department ${toMail} path: /invoiceRequest${req.path}`,
                                    error: null,
                                },
                                userInfo: {
                                    uesrId: req.body.user_id,
                                    role: req.body.user_role,
                                    platform: req.body.platform,
                                    screen: req.body.screen
                                },
                                OtherInfo: {
                                    aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                                }
                            }),
                        });
                    } catch (e) {
                        console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
                    }
                }

            }
            catch (error) {
                console.error("Error sending email:", error);
            }

            //create action log
            const actionLogSuccess = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 402,
                message: `Invoice Request Approve  by Director for selecting Undersecretary Successfull path: /invoiceRequest${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess })

            res.status(200).json({ success: true, message: "Invoice Request Approve  by Director for selecting Undersecretary successfully" });


        } catch (error: Error | any) {
            //create action log
            const actionLog = new ActionLog({
                user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
                islogin: false,
                rodocref: null,
                ronumber: null,
                docrefinvoice: null,
                old_data: {},
                edited_data: {},
                user_role,
                action: 402,
                message: `Invoice Request Approve  by Director for selecting Undersecretary Failed Error: ${error.message} path: /invoiceRequest${req.path}`,
                status: "Failed",
                platform: platform,
                networkip: clientIp || null,
                screen: screen,
                adRef: null,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null
                },
                note_sheet_allocation: approvedAdRef || null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog })
            console.error("❌ Error updating invoice:", error);
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: process.env.FAILED_LOG_TO_MAIL,
                        cc: process.env.FAILED_LOG_CC_MAIL,
                        actionName: "Invoice Request Approve  by Director for selecting Undersecretary ",
                        actionEndpoint: `/invoiceRequest${req.path}`,
                        ErrorInfo: {
                            message: error.message,
                            error: error,
                        },
                        userInfo: {
                            uesrId: req.body.user_id,
                            role: req.body.user_role,
                            platform: req.body.platform,
                            screen: req.body.screen
                        },
                        OtherInfo: {
                            aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                        }
                    }),
                });
            } catch (e) {
                console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
            }
            res.status(500).json({
                success: false,
                message: "Failed to update invoice",
                error: error.message,
            });
        }
    } catch (e: Error | any) {
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/send/fail-log`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: process.env.FAILED_LOG_TO_MAIL,
                    cc: process.env.FAILED_LOG_CC_MAIL,
                    actionName: "Invoice Request Approve  by Director for selecting Undersecretary ",
                    actionEndpoint: `/invoiceRequest${req.path}`,
                    ErrorInfo: {
                        message: e.message,
                        error: e,
                    },
                    userInfo: {
                        uesrId: req.body.user_id,
                        role: req.body.user_role,
                        platform: req.body.platform,
                        screen: req.body.screen
                    },
                    OtherInfo: {
                        aprovedAddRef: approvedAdId ? doc(db, "approved_add", approvedAdId) : null,
                    }
                }),
            });
        } catch (e) {
            console.error(`Failed to send email to ${process.env.FAILED_LOG_TO_MAIL}:`, e);
        }
        res.status(500).json({
            success: false,
            message: e.message,
            error: e,
        });
    }
};