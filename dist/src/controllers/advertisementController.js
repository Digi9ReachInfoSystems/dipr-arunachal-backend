import { getFirestore, doc, getDoc, writeBatch, serverTimestamp, getDocs, collection, DocumentReference, addDoc, updateDoc, increment, runTransaction, query, where, } from "firebase/firestore";
import moment from "moment-timezone";
import db from "../configs/firebase.js";
import Advertisement, {} from "../models/advertisementModel.js";
import ActionLog, { AllocationType, PlatformType } from "../models/actionLogModel.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";
import { Timestamp } from "firebase/firestore";
import PdfPrinter from "pdfmake";
import path from "path";
export const createAdvertisement = async (req, res) => {
    const xForwardedFor = req.headers["x-forwarded-for"];
    const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
    try {
        if (req.body.approvednewspaperslocal && req.body.approvednewspaperslocal.length > 0) {
            req.body.approvednewspaperslocal = req.body.approvednewspaperslocal
                .map((ref) => {
                if (ref && typeof ref === "string") {
                    const collectionData = ref.split("/");
                    if (collectionData.length > 2 && collectionData[1] && collectionData[2]) {
                        return doc(db, collectionData[1], collectionData[2]);
                    }
                }
                else {
                    return null;
                }
            });
        }
        if (req.body.DateOfApplication) {
            req.body.DateOfApplication = req.body.DateOfApplication ? new Date(req.body.DateOfApplication) : null;
        }
        if (req.body.DateOfApproval) {
            req.body.DateOfApproval = req.body.DateOfApproval ? new Date(req.body.DateOfApproval) : null;
        }
        if (req.body.RODATE) {
            req.body.RODATE = req.body.RODATE ? new Date(req.body.RODATE) : null;
        }
        if (req.body.publicationdateList && req.body.publicationdateList.length > 0) {
            req.body.publicationdateList = req.body.publicationdateList.map((dateStr) => new Date(dateStr));
        }
        let body = req.body;
        const ad = new Advertisement(body);
        let payload = {
            AdvertisementId: ad.AdvertisementId,
            DateOfApplication: ad.DateOfApplication || serverTimestamp(),
            Subject: ad.Subject,
            AddressTo: ad.AddressTo,
            TypeOfAdvertisement: ad.TypeOfAdvertisement,
            Is_CaseWorker: ad.Is_CaseWorker,
            Is_Deputy: ad.Is_Deputy,
            Is_fao: ad.Is_fao,
            Is_Vendor: ad.Is_Vendor,
            Status_Caseworker: ad.Status_Caseworker,
            Status_Deputy: ad.Status_Deputy,
            Status_Fao: ad.Status_Fao,
            Status_Vendor: ad.Status_Vendor,
            Bearingno: ad.Bearingno,
            Insertion: ad.Insertion,
            Department_name: ad.Department_name,
            type_face_size: ad.type_face_size,
            isDarft: ad.isDarft,
            ListofPdf: ad.ListofPdf,
            isnational: ad.isnational,
            isbothnationalandlocal: ad.isbothnationalandlocal,
            approvednewspaperslocal: ad.approvednewspaperslocal || [],
            RegionalNewspaper: ad.RegionalNewspaper,
            localnewspapers: ad.localnewspapers,
            DateOfApproval: ad.DateOfApproval || null,
            RODATE: ad.RODATE || null,
            Bill_to: ad.Bill_to,
            Edition: ad.Edition,
            publicationdateList: ad.publicationdateList || [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        // Save to Firestore
        const docRef = await addDoc(collection(db, "Advertisement"), payload);
        // create action log
        const actionLog = new ActionLog({
            user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
            islogin: false,
            rodocref: null,
            ronumber: null,
            old_data: {},
            edited_data: {},
            user_role: req.body.user_role || "",
            action: 5,
            message: `Create Release Order Advertisement Document created with ID ${docRef.id} path: /advertisement${req.path}`,
            status: "Success",
            platform: req.body.platform,
            networkip: clientIp || null,
            screen: req.body.screen,
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null,
            },
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            adRef: docRef.id ? doc(db, "Advertisement", docRef.id) : null,
        });
        const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
        // create action log
        const actionLogAdd = new ActionLog({
            user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
            islogin: false,
            rodocref: null,
            ronumber: null,
            old_data: {},
            edited_data: {},
            user_role: req.body.user_role || "",
            action: 100,
            message: `Create Release Order Action Completed Successfully path: /advertisement${req.path}`,
            status: "Success",
            platform: req.body.platform,
            networkip: clientIp || null,
            screen: req.body.screen,
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null,
            },
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            adRef: docRef.id ? doc(db, "Advertisement", docRef.id) : null,
        });
        const actionLogRefADD = await addDoc(collection(db, "actionLogs"), { ...actionLogAdd });
        return res.status(201).json({
            success: true,
            id: docRef.id,
            path: `/Advertisement/${docRef.id}`,
            data: payload,
            actionLogId: actionLogRef.id,
        });
    }
    catch (error) {
        console.error("Error in createReleaseOrder:", error);
        // create action log
        const actionLog = new ActionLog({
            user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
            islogin: false,
            rodocref: null,
            ronumber: null,
            old_data: {},
            edited_data: {},
            user_role: req.body.user_role || "",
            action: 100,
            message: `Error in createReleaseOrder: ${error} path: /advertisement${req.path}`,
            status: "Failed",
            platform: req.body.platform,
            networkip: clientIp || null,
            screen: req.body.screen,
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null,
            },
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            adRef: null,
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLog });
        res.status(500).json({ message: "Internal Server Error" });
    }
};
export const getAdvertisementById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "Advertisement ID is required" });
        }
        const docRef = doc(db, "Advertisement", id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            return res.status(404).json({ message: "Advertisement not found" });
        }
        const data = docSnap.data();
        return res.status(200).json({ success: true, data });
    }
    catch (error) {
        console.error("Error in getReleaseOrderById:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
export const editAdvertisement = async (req, res) => {
    const { id } = req.params;
    const xForwardedFor = req.headers["x-forwarded-for"];
    const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
    const docRef = doc(collection(db, "Advertisement"), id);
    try {
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Document ID is required",
            });
        }
        const updatePayload = {};
        // 🔹 Convert approvednewspaperslocal to DocumentReferences if passed
        if (req.body.approvednewspaperslocal && req.body.approvednewspaperslocal.length > 0) {
            updatePayload.approvednewspaperslocal = req.body.approvednewspaperslocal.map((ref) => {
                if (ref && typeof ref === "string") {
                    const collectionData = ref.split("/");
                    if (collectionData.length > 2 && collectionData[1] && collectionData[2]) {
                        return doc(db, collectionData[1], collectionData[2]);
                    }
                }
                return null;
            }).filter(Boolean);
        }
        // 🔹 Date conversions
        if (req.body.DateOfApplication)
            updatePayload.DateOfApplication = new Date(req.body.DateOfApplication);
        if (req.body.DateOfApproval)
            updatePayload.DateOfApproval = new Date(req.body.DateOfApproval);
        if (req.body.RODATE)
            updatePayload.RODATE = new Date(req.body.RODATE);
        if (req.body.publicationdateList && req.body.publicationdateList.length > 0)
            updatePayload.publicationdateList = req.body.publicationdateList.map((d) => new Date(d));
        // 🔹 Direct mappings
        const directFields = [
            "AdvertisementId",
            "Subject",
            "AddressTo",
            "TypeOfAdvertisement",
            "Bearingno",
            "Insertion",
            "Department_name",
            "type_face_size",
            "Bill_to",
            "Edition",
            "ListofPdf",
            "Body",
        ];
        directFields.forEach((field) => {
            if (req.body[field] !== 'null') {
                if (Array.isArray(req.body[field]) && req.body[field]?.length > 0) {
                    updatePayload[field] = req.body[field];
                }
                else if (typeof req.body[field] === 'string' && (req.body[field] !== 'null')) {
                    updatePayload[field] = req.body[field];
                }
            }
        });
        // 🔹 Boolean flags
        const booleanFields = [
            "Is_CaseWorker",
            "Is_Deputy",
            "Is_fao",
            "Is_Vendor",
            "isDarft",
            "isnational",
            "isbothnationalandlocal",
            "RegionalNewspaper",
            "localnewspapers",
        ];
        booleanFields.forEach((field) => {
            if (req.body[field] !== undefined)
                updatePayload[field] = Boolean(req.body[field]);
        });
        // 🔹 Integer fields
        const integerFields = [
            "Status_Caseworker",
            "Status_Deputy",
            "Status_Fao",
            "Status_Vendor",
        ];
        integerFields.forEach((field) => {
            if (req.body[field] !== 100)
                updatePayload[field] = Number(req.body[field]);
        });
        // 🔹 Update timestamps
        updatePayload.updatedAt = serverTimestamp();
        // 🔹 Perform Firestore update
        const oldData = (await getDoc(docRef)).data() || {};
        console.log("oldData", oldData);
        await updateDoc(docRef, updatePayload);
        const newData = (await getDoc(docRef)).data() || {};
        // create action log
        const actionLog = new ActionLog({
            user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
            islogin: false,
            rodocref: null,
            ronumber: null,
            old_data: oldData,
            edited_data: newData,
            user_role: req.body.user_role || "",
            action: 6,
            message: `Advertisement edited with ID ${docRef.id} path: /advertisement${req.path}`,
            status: "Success",
            platform: req.body.platform,
            networkip: clientIp || null,
            screen: req.body.screen,
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null,
            },
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            adRef: docRef.id ? doc(db, "Advertisement", docRef.id) : null,
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLog });
        return res.status(200).json({
            success: true,
            message: "Advertisement updated successfully",
            id,
            path: `Advertisement/${id}`,
            data: updatePayload,
        });
    }
    catch (error) {
        console.error("❌ Error in editAdvertisement:", error);
        // create action log
        const actionLog = new ActionLog({
            user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
            islogin: false,
            rodocref: null,
            ronumber: null,
            old_data: {},
            edited_data: {},
            user_role: req.body.user_role || "",
            action: 6,
            message: `Advertisement edit failed with ID ${id} error: ${error} path: /advertisement${req.path}`,
            status: "Failed",
            platform: req.body.platform,
            networkip: clientIp || null,
            screen: req.body.screen,
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null,
            },
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            adRef: id ? doc(db, "Advertisement", id) : null,
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLog });
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error instanceof Error ? error.message : error,
        });
    }
};
// export const automaticAllocationSendToNewspaperog = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const {
//       advertisementId,
//       numOfVendors,
//     } = req.body;
//     let logStatus = "success";
//     let logMessage = "Automatic allocation completed successfully.";
//     let oldData: any = {};
//     let editedData: any = {};
//     if (!advertisementId || !numOfVendors) {
//       throw new Error("Missing required parameters: advertisementId or numOfVendors");
//     }
//     // step-1 Prepare allotednewspapers array and roNumber
//     const allotednewspapers: string[] = [];
//     const jobLogiDataSnapshot = await getDocs(collection(db, "joblogic"));
//     if (jobLogiDataSnapshot.empty) {
//       return res.status(404).json({ message: "Job logic data document does not exist" });
//     }
//     const docSnap = jobLogiDataSnapshot.docs[0];
//     if (!docSnap) {
//       return res.status(404).json({ message: "Job logic data document does not exist" });
//     }
//     const jobLogicData = docSnap.data();
//     const ronumbers = jobLogicData.ronumbers || 0;
//     const newspapers = jobLogicData.waitingquuelist || [];
//     for (let i = 0; i < Number(numOfVendors); i++) {
//       const newspaper = newspapers[i % newspapers.length];
//       allotednewspapers.push(newspaper);
//     }
//     // 🔹 Step 2 — Update Advertisement document
//     const adRef = doc(db, "Advertisement", advertisementId);
//     const adSnap = await getDoc(adRef);
//     if (!adSnap.exists()) {
//       return res.status(404).json({ message: "Advertisement not found" });
//     }
//     await updateDoc(adRef, {
//       allotednewspapers,
//       Status_Deputy: 2,
//       Status_Vendor: 1,
//       Status_Caseworker: 5,
//       approved: true,
//       Is_CaseWorker: true,
//       DateOfApproval: serverTimestamp(),
//       isDarft: false,
//       approvedstatus: 0,
//       updatedAt: serverTimestamp(),
//       Release_order_no: `DIPR/ARN/${ronumbers}`,
//     });
//     console.log("✅ Advertisement updated successfully");
//     // 🔹 Step 3 — Fetch first joblogic document
//     const joblogicSnapshot = await getDocs(collection(db, "joblogic"));
//     const joblogicDoc = joblogicSnapshot.docs[0];
//     if (!joblogicDoc) {
//       return res.status(404).json({ message: "Joblogic document not found" });
//     }
//     const joblogicRef = doc(db, "joblogic", joblogicDoc.id);
//     // 🔹 Step 4 — Create NewspaperJobAllocation documents
//     const num = parseInt(numOfVendors) || allotednewspapers.length;
//     if (num === 0) {
//       return res.status(400).json({ message: "No vendors provided" });
//     }
//     let joballocationData = [];
//     let vendorMailList = [];
//     const newsPaperList: string[] = [];
//     const istOffsetMs = 5.5 * 60 * 60 * 1000;
//     const now = new Date();
//     const nowIST = new Date(now.getTime() + istOffsetMs);
//     const dueIST = new Date(
//       nowIST.getFullYear(),
//       nowIST.getMonth(),
//       nowIST.getDate(),
//       19, 0, 0, 0
//     );
//     const dueUTC = new Date(dueIST.getTime());
//     for (let i = 0; i < num; i++) {
//       const vendorRef = allotednewspapers[i];
//       console.log("value", vendorRef);
//       if (!vendorRef) continue;
//       // ✅ Case 1: vendorRef is already a DocumentReference
//       let vendorDocRef: DocumentReference<DocumentData> | null = null;
//       if (vendorRef && typeof vendorRef === "object" && "id" in vendorRef) {
//         vendorDocRef = vendorRef as DocumentReference<DocumentData>;
//       }
//       // ✅ Case 2: vendorRef is a string path like "Users/abc123"
//       else if (typeof vendorRef === "string") {
//         const collectionData = vendorRef.split("/");
//         if (collectionData.length >= 2 && collectionData[0] && collectionData[1]) {
//           vendorDocRef = doc(db, collectionData[0], collectionData[1]);
//         }
//       }
//       if (!vendorDocRef) {
//         console.warn(`⚠️ Invalid vendor reference format: ${vendorRef}`);
//         continue;
//       }
//       const allocationPayload = {
//         timeofallotment: serverTimestamp(),
//         acknowledgedboolean: false,
//         newspaperrefuserref: vendorDocRef || null,
//         adref: adRef,
//         completed: false,
//         aprovedcw: true,
//         invoiceraised: false,
//         duetime: dueUTC,
//         ronumber: `DIPR/ARN/${ronumbers + i + 1}`,
//         createdAt: serverTimestamp(),
//       };
//       const allocationDocRef = await addDoc(collection(db, "NewspaperJobAllocation"), allocationPayload);
//       joballocationData.push({ id: allocationDocRef.id, ...allocationPayload });
//       console.log(`📰 Created allocation for vendor ${i + 1}`);
//       const userSnap = await getDoc(vendorDocRef);
//       if (userSnap.exists()) {
//         const userData = userSnap.data();
//         if (userData) {
//           vendorMailList.push({
//             // to: userData.email || "",
//             to: "jayanthbr@digi9.co.in",
//             roNumber: `DIPR/ARN/${ronumbers + i}`,
//             addressTo: "Technical Assistant",
//           });
//           if (userData.display_name) {
//             newsPaperList.push(userData.display_name);
//           }
//         }
//       }
//     }
//     // 🔹 Step 5 — Increment ronumber counter atomically
//     await updateDoc(joblogicRef, {
//       ronumbers: increment(num),
//       updatedAt: serverTimestamp(),
//     });
//     // step 6 -  Update waitingquuelist put alloted newspapers to end of the list
//     const updatedWaitingQueueList = [...newspapers.slice(num), ...newspapers.slice(0, num)];
//     await updateDoc(joblogicRef, {
//       waitingquuelist: updatedWaitingQueueList,
//     });
//     console.log("🔁 Joblogic ronumbers incremented successfully");
//     //mail logic to vendors
//     for (const mail of vendorMailList) {
//       try {
//         const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/release-order`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(mail),
//         });
//         console.log(`Email sent to ${mail.to}`);
//       } catch (err: any) {
//         console.error(`Failed to send email to ${mail.to}:`, err.message);
//       }
//     }
//     // Send mail to department
//     const advertisementNumber = adSnap.data().AdvertisementId || "";
//     const to = adSnap.data().Bearingno || "";
//     try {
//       const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/informDept`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           // to,
//           to:"jayanthbr@digi9.co.in",
//           advertisementNumber,
//           cc: "diprarunx@gmail.com,diprarunpub@gmail.com",
//           listOfNewspapers: newsPaperList,
//         }),
//       });
//       console.log(`Email sent to department`, to, response);
//     } catch (err: Error | any) {
//       console.error(`Failed to send email to ${to}:`, err.message);
//     }
//     // ✅ Success response
//     return res.status(200).json({
//       success: true,
//       message: "Automatic allocation completed successfully.",
//       updatedAdvertisement: advertisementId,
//       allocationsCreated: num,
//       joballocationData,
//     });
//   } catch (error) {
//     console.error("❌ Error in automaticAllocationSendToNewspaper:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error instanceof Error ? error.message : error,
//     });
//   }
// };
export const automaticAllocationSendToNewspaper = async (req, res) => {
    const { advertisementId, numOfVendors, user_ref, user_role, platform, screen } = req.body;
    let logStatus = "success";
    let logMessage = "Automatic allocation completed successfully.";
    let oldData = {};
    let editedData = {};
    const networkip = req.ip || null;
    let successAllocations = [];
    const xForwardedFor = req.headers["x-forwarded-for"];
    const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
    if (!advertisementId || !numOfVendors) {
        throw new Error("Missing required parameters: advertisementId or numOfVendors");
    }
    // 🔹 Prepare data
    const adRef = doc(db, "Advertisement", advertisementId);
    const adSnap = await getDoc(adRef);
    if (!adSnap.exists())
        throw new Error("Advertisement not found");
    oldData = adSnap.data();
    const jobLogicSnap = await getDocs(collection(db, "joblogic"));
    if (jobLogicSnap.empty)
        throw new Error("Joblogic not found");
    const joblogicDoc = jobLogicSnap.docs[0];
    if (!joblogicDoc)
        throw new Error("Joblogic document not found");
    const joblogicRef = doc(db, "joblogic", joblogicDoc.id);
    const jobLogicData = joblogicDoc.data();
    const ronumbers = jobLogicData.ronumbers || 0;
    const newspapers = jobLogicData.waitingquuelist || [];
    const allotednewspapers = [];
    for (let i = 0; i < Number(numOfVendors); i++) {
        allotednewspapers.push(newspapers[i % newspapers.length]);
    }
    // 🔹 Calculate due time (7 PM IST today)
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const nowIST = new Date(now.getTime() + istOffsetMs);
    const dueIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate(), 19, 0, 0, 0);
    const dueUTC = new Date(dueIST.getTime());
    let joballocationData = [];
    let vendorMailList = [];
    const newsPaperList = [];
    try {
        // 🔹 Transaction
        const result = await runTransaction(db, async (transaction) => {
            // 1. Update Advertisement
            const updateResult = await transaction.update(adRef, {
                allotednewspapers,
                Status_Deputy: 2,
                Status_Vendor: 1,
                Status_Caseworker: 5,
                approved: true,
                Is_CaseWorker: true,
                DateOfApproval: serverTimestamp(),
                isDarft: false,
                approvedstatus: 0,
                updatedAt: serverTimestamp(),
                Release_order_no: `DIPR/ARN/${ronumbers}`,
                manuallyallotted: false,
            });
            // 2. Create NewspaperJobAllocation docs
            for (let i = 0; i < numOfVendors; i++) {
                const vendorRefPath = allotednewspapers[i];
                // console.log("value", vendorRefPath);
                let vendorDocRef = null;
                vendorDocRef = vendorRefPath;
                const allocationPayload = {
                    timeofallotment: serverTimestamp(),
                    acknowledgedboolean: false,
                    newspaperrefuserref: vendorDocRef,
                    adref: adRef,
                    completed: false,
                    aprovedcw: true,
                    invoiceraised: false,
                    duetime: dueUTC,
                    ronumber: `DIPR/ARN/${ronumbers + i}`,
                    createdAt: serverTimestamp(),
                };
                const allocationRef = doc(collection(db, "NewspaperJobAllocation"));
                transaction.set(allocationRef, allocationPayload);
                // console.log(`📰 Created allocation for vendor ${vendorDocRef}`);
                if (!vendorDocRef)
                    continue;
                const userSnap = await getDoc(vendorDocRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    if (userData) {
                        vendorMailList.push({
                            to: userData.email || "",
                            // to: "jayanthbr@digi9.co.in",
                            roNumber: `DIPR/ARN/${ronumbers + i}`,
                            addressTo: "Technical Assistant",
                            allocationRef: allocationRef,
                        });
                        if (userData.display_name) {
                            newsPaperList.push(userData.display_name);
                        }
                    }
                }
                successAllocations.push({ ref: allocationRef, payload: allocationPayload });
                joballocationData.push({ id: allocationRef.id, ...allocationPayload });
            }
            // 3. Increment ronumber and rotate queue
            const updatedQueue = [...newspapers.slice(numOfVendors), ...newspapers.slice(0, numOfVendors)];
            transaction.update(joblogicRef, {
                ronumbers: increment(numOfVendors),
                waitingquuelist: updatedQueue,
                updatedAt: serverTimestamp(),
            });
            return { allotednewspapers, ronumbers, numOfVendors, successAllocations };
        });
        console.log("✅ Transaction committed successfully");
        //mail logic to vendors
        for (const mail of vendorMailList) {
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/release-order`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(mail),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                        islogin: false,
                        rodocref: mail.allocationRef, // each allocation doc ref
                        ronumber: mail.roNumber,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Automatic Allocation sent  to newspaper mail sent to vendors Successfully to mail id ${mail.to} path: /advertisement${req.path}`,
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
                        adRef: adRef,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                }
                else {
                    const actionLog = new ActionLog({
                        user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                        islogin: false,
                        rodocref: mail.allocationRef, // each allocation doc ref
                        ronumber: mail.roNumber,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Automatic Allocation sent  to newspaper mail sent to vendors Failed to mail id ${mail.to} path: /advertisement${req.path}`,
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
                        adRef: adRef,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                }
                console.log(`Email sent to ${mail.to}`, response);
            }
            catch (err) {
                console.error(`Failed to send email to ${mail.to}:`, err.message);
            }
        }
        // Send mail to department
        const advertisementNumber = adSnap.data().AdvertisementId || "";
        const to = adSnap.data().Bearingno || "";
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/informDept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to,
                    // to: "jayanthbr@digi9.co.in",
                    advertisementNumber,
                    cc: "diprarunadvt@gmail.com", //diprarunx@gmail.com,diprarunpub@gmail.com
                    listOfNewspapers: newsPaperList,
                }),
            });
            if (response.status == 200) {
                //create action log for mail sent
                const actionLog = new ActionLog({
                    user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                    islogin: false,
                    rodocref: null, // each allocation doc ref
                    ronumber: null,
                    old_data: {},
                    edited_data: {},
                    user_role,
                    action: 4,
                    message: `Automatic Allocation sent  to newspaper mail sent to department Successfully to mail id ${to} path: /advertisement${req.path}`,
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
                    adRef: adRef,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                });
                const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            }
            else {
                const actionLog = new ActionLog({
                    user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                    islogin: false,
                    rodocref: null, // each allocation doc ref
                    ronumber: null,
                    old_data: {},
                    edited_data: {},
                    user_role,
                    action: 4,
                    message: `Automatic Allocation sent  to newspaper mail sent to department Failed to mail id ${to} path: /advertisement${req.path}`,
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
                    adRef: adRef,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                });
                const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            }
            console.log(`Email sent to department`, to, response);
        }
        catch (err) {
            console.error(`Failed to send email to ${to}:`, err.message);
        }
        editedData = { allotednewspapers: result.allotednewspapers };
        logStatus = "success";
        logMessage = `Automatic allocation successful for ${numOfVendors} vendors.`;
        // ✅ Log success
        const actionLogRefs = [];
        for (const { ref: allocRef, payload } of result.successAllocations) {
            const actionLog = new ActionLog({
                user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                islogin: false,
                rodocref: allocRef, // each allocation doc ref
                ronumber: payload.ronumber,
                old_data: oldData,
                edited_data: payload,
                user_role,
                action: 101,
                message: `Automatic allocation successful sent to newspaper (${payload.ronumber})  path: /advertisement${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen,
                Newspaper_allocation: {
                    Newspaper: allotednewspapers,
                    allotedtime: new Date(),
                    allocation_type: AllocationType.AUTOMATIC,
                    allotedby: user_ref ? doc(db, "Users", user_ref) : null,
                },
                adRef: allocRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
            });
            const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            actionLogRefs.push(actionLogRef.id);
        }
        return res.status(200).json({
            success: true,
            message: logMessage,
            updatedAdvertisement: advertisementId,
            allocationsCreated: numOfVendors,
            joballocationData,
            actionLogId: actionLogRefs,
        });
    }
    catch (error) {
        console.error("❌ Transaction failed:", error);
        logStatus = "error";
        logMessage = error.message || "Automatic allocation failed.";
        // Log failure
        for (const alloc of successAllocations) {
            const actionLog = new ActionLog({
                user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
                islogin: false,
                rodocref: alloc.ref,
                ronumber: alloc.payload?.ronumber,
                old_data: oldData,
                edited_data: alloc.payload,
                user_role: req.body.user_role || "",
                action: 101,
                message: `Automatic allocation sent to newspapers failed: ${error.message} path: /advertisement${req.path}`,
                status: "Failed",
                platform: req.body.platform,
                networkip: clientIp || null,
                screen: req.body.screen,
                Newspaper_allocation: {
                    Newspaper: allotednewspapers,
                    allotedtime: new Date(),
                    allocation_type: AllocationType.AUTOMATIC,
                    allotedby: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
                },
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                adRef: adRef,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog });
        }
        res.status(500).json({ success: false, message: logMessage, error: error.message });
    }
};
export const manualAllocationSendToNewspaper = async (req, res) => {
    const { advertisementId, allotedNewspapers, user_ref, user_role, platform, screen } = req.body;
    let logStatus = "success";
    let logMessage = "Manual allocation completed successfully.";
    let oldData = {};
    let editedData = {};
    const networkip = req.ip || null;
    let successAllocations = [];
    const xForwardedFor = req.headers["x-forwarded-for"];
    const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
    if (!advertisementId || !allotedNewspapers || allotedNewspapers.length === 0) {
        throw new Error("Missing required parameters: advertisementId  or allotedNewspapers");
    }
    const numOfVendors = allotedNewspapers.length;
    // 🔹 Prepare data
    const adRef = doc(db, "Advertisement", advertisementId);
    const adSnap = await getDoc(adRef);
    if (!adSnap.exists())
        throw new Error("Advertisement not found");
    oldData = adSnap.data();
    const jobLogicSnap = await getDocs(collection(db, "joblogic"));
    if (jobLogicSnap.empty)
        throw new Error("Joblogic not found");
    const joblogicDoc = jobLogicSnap.docs[0];
    if (!joblogicDoc)
        throw new Error("Joblogic document not found");
    const joblogicRef = doc(db, "joblogic", joblogicDoc.id);
    const jobLogicData = joblogicDoc.data();
    const ronumbers = jobLogicData.ronumbers || 0;
    const newspapers = jobLogicData.waitingquuelist || [];
    let allotednewspapers = [];
    if (allotedNewspapers && allotedNewspapers.length > 0) {
        const collectionData = allotedNewspapers.map((ref) => {
            const parts = ref.split("/");
            console.log("parts", parts);
            if (parts.length >= 2 && parts[2] && parts[1]) {
                return doc(db, parts[1], parts[2]); // keep as string path
            }
            return null;
        });
        console.log("collectionData", collectionData);
        allotednewspapers = collectionData.filter(Boolean);
    }
    // 🔹 Calculate due time (7 PM IST today)
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const nowIST = new Date(now.getTime() + istOffsetMs);
    const dueIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate(), 19, 0, 0, 0);
    const dueUTC = new Date(dueIST.getTime());
    let joballocationData = [];
    let vendorMailList = [];
    const newsPaperList = [];
    try {
        // 🔹 Transaction
        const result = await runTransaction(db, async (transaction) => {
            // 1. Update Advertisement
            const updateResult = await transaction.update(adRef, {
                allotednewspapers,
                Status_Deputy: 2,
                Status_Vendor: 1,
                Status_Caseworker: 5,
                approved: true,
                Is_CaseWorker: true,
                DateOfApproval: serverTimestamp(),
                isDarft: false,
                approvedstatus: 0,
                updatedAt: serverTimestamp(),
                Release_order_no: `DIPR/ARN/${ronumbers}`,
                manuallyallotted: true,
            });
            // 2. Create NewspaperJobAllocation docs
            for (let i = 0; i < numOfVendors; i++) {
                const vendorRefPath = allotednewspapers[i];
                // console.log("value", vendorRefPath);
                let vendorDocRef = null;
                vendorDocRef = vendorRefPath;
                const allocationPayload = {
                    timeofallotment: serverTimestamp(),
                    acknowledgedboolean: false,
                    newspaperrefuserref: vendorDocRef,
                    adref: adRef,
                    completed: false,
                    aprovedcw: true,
                    invoiceraised: false,
                    duetime: dueUTC,
                    ronumber: `DIPR/ARN/${ronumbers + i}`,
                    createdAt: serverTimestamp(),
                };
                const allocationRef = doc(collection(db, "NewspaperJobAllocation"));
                transaction.set(allocationRef, allocationPayload);
                // console.log(`📰 Created allocation for vendor ${vendorDocRef}`);
                if (!vendorDocRef)
                    continue;
                const userSnap = await getDoc(vendorDocRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    if (userData) {
                        vendorMailList.push({
                            to: userData.email || "",
                            // to: "jayanthbr@digi9.co.in",
                            roNumber: `DIPR/ARN/${ronumbers + i}`,
                            addressTo: "Technical Assistant",
                            allocationRef: allocationRef,
                        });
                        if (userData.display_name) {
                            newsPaperList.push(userData.display_name);
                        }
                    }
                }
                successAllocations.push({ ref: allocationRef, payload: allocationPayload });
                joballocationData.push({ id: allocationRef.id, ...allocationPayload });
            }
            // 3. Increment ronumber and rotate queue
            const updatedQueue = [
                // Keep existing newspaper refs that weren’t just allotted
                ...newspapers.filter((np) => {
                    const npId = typeof np === "string" ? np.split("/").pop() : np?.id;
                    return !allotednewspapers.some((ref) => {
                        const refId = typeof ref === "string" ? ref.split("/").pop() : ref?.id;
                        return npId === refId;
                    });
                }),
                // Add the newly allotted refs (as DocumentReferences)
                ...allotednewspapers.map((ref) => {
                    if (typeof ref === "string") {
                        const collectionData = ref.split("/");
                        if (collectionData.length >= 2 && collectionData[2] && collectionData[1]) {
                            return doc(db, collectionData[1], collectionData[2]);
                        }
                    }
                    return ref;
                }),
            ];
            transaction.update(joblogicRef, {
                ronumbers: increment(numOfVendors),
                waitingquuelist: updatedQueue,
                updatedAt: serverTimestamp(),
            });
            return { allotednewspapers, ronumbers, numOfVendors, successAllocations };
        });
        console.log("✅ Transaction committed successfully");
        //mail logic to vendors
        for (const mail of vendorMailList) {
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/release-order`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(mail),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                        islogin: false,
                        rodocref: mail.allocationRef, // each allocation doc ref
                        ronumber: mail.roNumber,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Manual Allocation sent  to newspaper mail sent to vendors Successfully to mail id ${mail.to} path: /advertisement${req.path}`,
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
                        adRef: adRef,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                }
                else {
                    const actionLog = new ActionLog({
                        user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                        islogin: false,
                        rodocref: mail.allocationRef, // each allocation doc ref
                        ronumber: mail.roNumber,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Manual Allocation sent  to newspaper mail sent to vendors Failed to mail id ${mail.to} path: /advertisement${req.path}`,
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
                        adRef: adRef,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                }
                console.log(`Email sent to ${mail.to}`, response);
            }
            catch (err) {
                console.error(`Failed to send email to ${mail.to}:`, err.message);
            }
        }
        // Send mail to department
        const advertisementNumber = adSnap.data().AdvertisementId || "";
        const to = adSnap.data().Bearingno || "";
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/informDept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to,
                    // to: "jayanthbr@digi9.co.in",
                    advertisementNumber,
                    cc: "diprarunadvt@gmail.com", //diprarunx@gmail.com,diprarunpub@gmail.com
                    listOfNewspapers: newsPaperList,
                }),
            });
            if (response.status == 200) {
                //create action log for mail sent
                const actionLog = new ActionLog({
                    user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                    islogin: false,
                    rodocref: null, // each allocation doc ref
                    ronumber: null,
                    old_data: {},
                    edited_data: {},
                    user_role,
                    action: 4,
                    message: `Manual Allocation sent  to newspaper mail sent to department Successfully to mail id ${to} path: /advertisement${req.path}`,
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
                    adRef: adRef,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                });
                const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            }
            else {
                const actionLog = new ActionLog({
                    user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                    islogin: false,
                    rodocref: null, // each allocation doc ref
                    ronumber: null,
                    old_data: {},
                    edited_data: {},
                    user_role,
                    action: 4,
                    message: `Manual Allocation sent  to newspaper mail sent to department Failed to mail id ${to} path: /advertisement${req.path}`,
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
                    adRef: adRef,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                });
                const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            }
            console.log(`Email sent to department`, to, response);
        }
        catch (err) {
            console.error(`Failed to send email to ${to}:`, err.message);
        }
        editedData = { allotednewspapers: result.allotednewspapers };
        logStatus = "success";
        logMessage = `Automatic allocation successful for ${numOfVendors} vendors.`;
        // ✅ Log success
        const actionLogRefs = [];
        for (const { ref: allocRef, payload } of result.successAllocations) {
            const actionLog = new ActionLog({
                user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                islogin: false,
                rodocref: allocRef, // each allocation doc ref
                ronumber: payload.ronumber,
                old_data: oldData,
                edited_data: payload,
                user_role,
                action: 102,
                message: `Manual allocation successful sent to newspapers path: /advertisement${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen,
                Newspaper_allocation: {
                    Newspaper: allotednewspapers,
                    allotedtime: new Date(),
                    allocation_type: AllocationType.AUTOMATIC,
                    allotedby: user_ref ? doc(db, "Users", user_ref) : null,
                },
                adRef: allocRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
            });
            const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            actionLogRefs.push(actionLogRef.id);
        }
        return res.status(200).json({
            success: true,
            message: logMessage,
            updatedAdvertisement: advertisementId,
            allocationsCreated: numOfVendors,
            joballocationData,
            actionLogId: actionLogRefs,
        });
    }
    catch (error) {
        console.error("❌ Transaction failed:", error);
        logStatus = "error";
        logMessage = error.message || "Automatic allocation failed.";
        // Log failure
        for (const alloc of successAllocations) {
            const actionLog = new ActionLog({
                user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
                islogin: false,
                rodocref: alloc.ref,
                ronumber: alloc.payload?.ronumber,
                old_data: oldData,
                edited_data: alloc.payload,
                user_role: req.body.user_role || "",
                action: 102,
                message: `Manual allocation failed sent to newspapers: ${error.message} path: /advertisement${req.path}`,
                status: "Failed",
                platform: req.body.platform,
                networkip: clientIp || null,
                screen: req.body.screen,
                Newspaper_allocation: {
                    Newspaper: allotednewspapers,
                    allotedtime: new Date(),
                    allocation_type: AllocationType.MANUAL,
                    allotedby: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
                },
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                adRef: adRef,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog });
        }
        res.status(500).json({ success: false, message: logMessage, error: error.message });
    }
};
export const automaticAllocationSendToDeputy = async (req, res) => {
    const { advertisementId, user_ref, user_role, platform, screen, numOfVendors } = req.body;
    let logStatus = "success";
    let logMessage = "Automatic allocation completed successfully.";
    let oldData = {};
    let editedData = {};
    const networkip = req.ip || null;
    let successAllocations = [];
    const xForwardedFor = req.headers["x-forwarded-for"];
    const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
    if (!advertisementId || !numOfVendors) {
        throw new Error("Missing required parameters: advertisementId or numOfVendors");
    }
    // 🔹 Prepare data
    const adRef = doc(db, "Advertisement", advertisementId);
    const adSnap = await getDoc(adRef);
    if (!adSnap.exists())
        throw new Error("Advertisement not found");
    oldData = adSnap.data();
    const jobLogicSnap = await getDocs(collection(db, "joblogic"));
    if (jobLogicSnap.empty)
        throw new Error("Joblogic not found");
    const joblogicDoc = jobLogicSnap.docs[0];
    if (!joblogicDoc)
        throw new Error("Joblogic document not found");
    const joblogicRef = doc(db, "joblogic", joblogicDoc.id);
    const jobLogicData = joblogicDoc.data();
    const ronumbers = jobLogicData.ronumbers || 0;
    const newspapers = jobLogicData.waitingquuelist || [];
    const allotednewspapers = [];
    for (let i = 0; i < Number(numOfVendors); i++) {
        allotednewspapers.push(newspapers[i % newspapers.length]);
    }
    // 🔹 Calculate due time (7 PM IST today)
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const nowIST = new Date(now.getTime() + istOffsetMs);
    const dueIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate(), 19, 0, 0, 0);
    const dueUTC = new Date(dueIST.getTime());
    let joballocationData = [];
    let vendorMailList = [];
    const newsPaperList = [];
    try {
        // 🔹 Transaction
        const result = await runTransaction(db, async (transaction) => {
            // 1. Update Advertisement
            const updateResult = await transaction.update(adRef, {
                caseworkerdraftnewspapers: allotednewspapers,
                Status_Deputy: 0,
                Status_Vendor: 1,
                Status_Caseworker: 5,
                approved: true,
                Is_CaseWorker: true,
                DateOfApproval: serverTimestamp(),
                isDarft: false,
                approvedstatus: 0,
                updatedAt: serverTimestamp(),
                Release_order_no: `DIPR/ARN/${ronumbers}`,
                IsrequesPending: true,
                manuallyallotted: false,
            });
            // 2. Create NewspaperJobAllocation docs
            for (let i = 0; i < numOfVendors; i++) {
                const vendorRefPath = allotednewspapers[i];
                // console.log("value", vendorRefPath);
                let vendorDocRef = null;
                vendorDocRef = vendorRefPath;
                const allocationPayload = {
                    timeofallotment: serverTimestamp(),
                    acknowledgedboolean: false,
                    newspaperrefuserref: vendorDocRef,
                    adref: adRef,
                    completed: false,
                    aprovedcw: false,
                    invoiceraised: false,
                    duetime: dueUTC,
                    ronumber: `DIPR/ARN/${ronumbers + i}`,
                    createdAt: serverTimestamp(),
                };
                const allocationRef = doc(collection(db, "NewspaperJobAllocation"));
                // console.log("allocationRef", allocationRef);
                // console.log("allocationPayload", allocationPayload);
                transaction.set(allocationRef, allocationPayload);
                // console.log(`📰 Created allocation for vendor ${vendorDocRef}`);
                if (!vendorDocRef)
                    continue;
                const userSnap = await getDoc(vendorDocRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    if (userData) {
                        vendorMailList.push({
                            to: userData.email || "",
                            roNumber: `DIPR/ARN/${ronumbers + i}`,
                            addressTo: "Technical Assistant",
                        });
                        if (userData.display_name) {
                            newsPaperList.push(userData.display_name);
                        }
                    }
                }
                successAllocations.push({ ref: allocationRef, payload: allocationPayload });
                joballocationData.push({ id: allocationRef.id, ...allocationPayload });
            }
            // 3. Increment ronumber and rotate queue
            // For manual allocation, we do not rotate the queue as per original logic just keep the same order and move the mentioned newspapers to the end
            // console.log("newspapers", newspapers);
            const updatedQueue = [
                // Keep existing newspaper refs that weren’t just allotted
                ...newspapers.filter((np) => {
                    const npId = typeof np === "string" ? np.split("/").pop() : np?.id;
                    return !allotednewspapers.some((ref) => {
                        const refId = typeof ref === "string" ? ref.split("/").pop() : ref?.id;
                        return npId === refId;
                    });
                }),
                // Add the newly allotted refs (as DocumentReferences)
                ...allotednewspapers.map((ref) => {
                    if (typeof ref === "string") {
                        const collectionData = ref.split("/");
                        if (collectionData.length >= 2 && collectionData[2] && collectionData[1]) {
                            return doc(db, collectionData[1], collectionData[2]);
                        }
                    }
                    return ref;
                }),
            ];
            transaction.update(joblogicRef, {
                ronumbers: increment(numOfVendors),
                waitingquuelist: updatedQueue,
                updatedAt: serverTimestamp(),
            });
            return { allotednewspapers, ronumbers, numOfVendors, successAllocations };
        });
        console.log("✅ Transaction committed successfully");
        // Send mail to department
        const userEmailSnap = await getDocs(collection(db, "UsersEmail"));
        let to = "";
        if (!userEmailSnap.empty) {
            const userEmailDoc = userEmailSnap.docs[0];
            if (userEmailDoc) {
                to = userEmailDoc.data().ddipradvtgmailcom || "";
            }
        }
        const advertisementNumber = adSnap.data().AdvertisementId || "";
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/informDept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to,
                    // to: "jayanthbr@digi9.co.in",
                    advertisementNumber,
                    cc: "diprarunadvt@gmail.com", //diprarunx@gmail.com,diprarunpub@gmail.com
                    listOfNewspapers: newsPaperList,
                }),
            });
            if (response.status == 200) {
                //create action log for mail sent
                const actionLog = new ActionLog({
                    user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                    islogin: false,
                    rodocref: null, // each allocation doc ref
                    ronumber: null,
                    old_data: {},
                    edited_data: {},
                    user_role,
                    action: 4,
                    message: `Automatic Allocation sent  to Deputy Director mail sent to department Successfully to mail id ${to} path: /advertisement${req.path}`,
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
                    adRef: adRef,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                });
                const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            }
            else {
                const actionLog = new ActionLog({
                    user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                    islogin: false,
                    rodocref: null, // each allocation doc ref
                    ronumber: null,
                    old_data: {},
                    edited_data: {},
                    user_role,
                    action: 4,
                    message: `Automatic Allocation sent  to Deputy Director mail sent to department Failed to mail id ${to} path: /advertisement${req.path}`,
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
                    adRef: adRef,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                });
                const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            }
            console.log(`Email sent to department`, to, response);
        }
        catch (err) {
            console.error(`Failed to send email to ${to}:`, err.message);
        }
        editedData = { allotednewspapers: result.allotednewspapers };
        logStatus = "success";
        logMessage = `Automatic allocation successful for ${numOfVendors} vendors.`;
        // ✅ Log success
        const actionLogRefs = [];
        for (const { ref: allocRef, payload } of result.successAllocations) {
            const actionLog = new ActionLog({
                user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                islogin: false,
                rodocref: allocRef,
                ronumber: payload.ronumber,
                old_data: oldData,
                edited_data: payload,
                user_role,
                action: 103,
                message: `Automatic allocation successful and send to deputy path: /advertisement${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen,
                Newspaper_allocation: {
                    Newspaper: allotednewspapers,
                    allotedtime: new Date(),
                    allocation_type: AllocationType.AUTOMATIC,
                    allotedby: user_ref ? doc(db, "Users", user_ref) : null,
                },
                adRef: allocRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
            });
            const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            actionLogRefs.push(actionLogRef.id);
        }
        return res.status(200).json({
            success: true,
            message: logMessage,
            updatedAdvertisement: advertisementId,
            allocationsCreated: numOfVendors,
            joballocationData,
            actionLogId: actionLogRefs,
        });
    }
    catch (error) {
        console.error("❌ Transaction failed:", error);
        logStatus = "error";
        logMessage = error.message || "Automatic allocation failed.";
        // Log failure
        for (const alloc of successAllocations) {
            const actionLog = new ActionLog({
                user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
                islogin: false,
                rodocref: alloc.ref || null,
                ronumber: alloc.payload?.ronumber,
                old_data: oldData,
                edited_data: alloc.payload,
                user_role: req.body.user_role || "",
                action: 103,
                message: `Automatic allocation send to deputy failed: ${error.message} path: /advertisement${req.path}`,
                status: "Failed",
                platform: req.body.platform,
                networkip: clientIp || null,
                screen: req.body.screen,
                Newspaper_allocation: {
                    Newspaper: allotednewspapers,
                    allotedtime: new Date(),
                    allocation_type: AllocationType.AUTOMATIC,
                    allotedby: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
                },
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                adRef: adRef,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog });
        }
        res.status(500).json({ success: false, message: logMessage, error: error.message });
    }
};
export const manualAllocationSendToDeputy = async (req, res) => {
    const { advertisementId, user_ref, user_role, platform, screen, allotedNewspapers } = req.body;
    let logStatus = "success";
    let logMessage = "Automatic allocation completed successfully.";
    let oldData = {};
    let editedData = {};
    const networkip = req.ip || null;
    let successAllocations = [];
    const xForwardedFor = req.headers["x-forwarded-for"];
    const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
    if (!advertisementId || !allotedNewspapers || allotedNewspapers.length === 0) {
        throw new Error("Missing required parameters: advertisementId  or allotedNewspapers");
    }
    const numOfVendors = allotedNewspapers.length;
    // 🔹 Prepare data
    const adRef = doc(db, "Advertisement", advertisementId);
    const adSnap = await getDoc(adRef);
    if (!adSnap.exists())
        throw new Error("Advertisement not found");
    oldData = adSnap.data();
    const jobLogicSnap = await getDocs(collection(db, "joblogic"));
    if (jobLogicSnap.empty)
        throw new Error("Joblogic not found");
    const joblogicDoc = jobLogicSnap.docs[0];
    if (!joblogicDoc)
        throw new Error("Joblogic document not found");
    const joblogicRef = doc(db, "joblogic", joblogicDoc.id);
    const jobLogicData = joblogicDoc.data();
    const ronumbers = jobLogicData.ronumbers || 0;
    const newspapers = jobLogicData.waitingquuelist || [];
    let allotednewspapers = [];
    if (allotedNewspapers && allotedNewspapers.length > 0) {
        const collectionData = allotedNewspapers.map((ref) => {
            const parts = ref.split("/");
            console.log("parts", parts);
            if (parts.length >= 2 && parts[2] && parts[1]) {
                return doc(db, parts[1], parts[2]); // keep as string path
            }
            return null;
        });
        console.log("collectionData", collectionData);
        allotednewspapers = collectionData.filter(Boolean);
    }
    console.log("allotednewspapers", allotednewspapers);
    // 🔹 Calculate due time (7 PM IST today)
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const nowIST = new Date(now.getTime() + istOffsetMs);
    const dueIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate(), 19, 0, 0, 0);
    const dueUTC = new Date(dueIST.getTime());
    let joballocationData = [];
    let vendorMailList = [];
    const newsPaperList = [];
    try {
        // 🔹 Transaction
        const result = await runTransaction(db, async (transaction) => {
            // 1. Update Advertisement
            const updateResult = await transaction.update(adRef, {
                caseworkerdraftnewspapers: allotednewspapers,
                Status_Deputy: 0,
                Status_Vendor: 1,
                Status_Caseworker: 5,
                approved: true,
                Is_CaseWorker: true,
                DateOfApproval: serverTimestamp(),
                isDarft: false,
                approvedstatus: 0,
                updatedAt: serverTimestamp(),
                Release_order_no: `DIPR/ARN/${ronumbers}`,
                IsrequesPending: false,
                manuallyallotted: true,
            });
            // 2. Create NewspaperJobAllocation docs
            for (let i = 0; i < numOfVendors; i++) {
                const vendorRefPath = allotednewspapers[i];
                // console.log("value", vendorRefPath);
                let vendorDocRef = null;
                vendorDocRef = vendorRefPath;
                const allocationPayload = {
                    timeofallotment: serverTimestamp(),
                    acknowledgedboolean: false,
                    newspaperrefuserref: vendorDocRef,
                    adref: adRef,
                    completed: false,
                    aprovedcw: false,
                    invoiceraised: false,
                    duetime: dueUTC,
                    ronumber: `DIPR/ARN/${ronumbers + i}`,
                    createdAt: serverTimestamp(),
                };
                const allocationRef = doc(collection(db, "NewspaperJobAllocation"));
                console.log("allocationRef", allocationRef);
                console.log("allocationPayload", allocationPayload);
                transaction.set(allocationRef, allocationPayload);
                // console.log(`📰 Created allocation for vendor ${vendorDocRef}`);
                if (!vendorDocRef)
                    continue;
                const userSnap = await getDoc(vendorDocRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    if (userData) {
                        vendorMailList.push({
                            to: userData.email || "",
                            roNumber: `DIPR/ARN/${ronumbers + i}`,
                            addressTo: "Technical Assistant",
                        });
                        if (userData.display_name) {
                            newsPaperList.push(userData.display_name);
                        }
                    }
                }
                successAllocations.push({ ref: allocationRef, payload: allocationPayload });
                joballocationData.push({ id: allocationRef.id, ...allocationPayload });
            }
            // 3. Increment ronumber and rotate queue
            // For manual allocation, we do not rotate the queue as per original logic just keep the same order and move the mentioned newspapers to the end
            console.log("newspapers", newspapers);
            const updatedQueue = [
                // Keep existing newspaper refs that weren’t just allotted
                ...newspapers.filter((np) => {
                    const npId = typeof np === "string" ? np.split("/").pop() : np?.id;
                    return !allotednewspapers.some((ref) => {
                        const refId = typeof ref === "string" ? ref.split("/").pop() : ref?.id;
                        return npId === refId;
                    });
                }),
                // Add the newly allotted refs (as DocumentReferences)
                ...allotednewspapers.map((ref) => {
                    if (typeof ref === "string") {
                        const collectionData = ref.split("/");
                        if (collectionData.length >= 2 && collectionData[2] && collectionData[1]) {
                            return doc(db, collectionData[1], collectionData[2]);
                        }
                    }
                    return ref;
                }),
            ];
            transaction.update(joblogicRef, {
                ronumbers: increment(numOfVendors),
                waitingquuelist: updatedQueue,
                updatedAt: serverTimestamp(),
            });
            return { allotednewspapers, ronumbers, numOfVendors, successAllocations };
        });
        console.log("✅ Transaction committed successfully");
        // Send mail to department
        const userEmailSnap = await getDocs(collection(db, "UsersEmail"));
        let to = "";
        if (!userEmailSnap.empty) {
            const userEmailDoc = userEmailSnap.docs[0];
            if (userEmailDoc) {
                to = userEmailDoc.data().ddipradvtgmailcom || "";
            }
        }
        const advertisementNumber = adSnap.data().AdvertisementId || "";
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/informDept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to,
                    // to: "jayanthbr@digi9.co.in",
                    advertisementNumber,
                    cc: "diprarunadvt@gmail.com", //diprarunx@gmail.com,diprarunpub@gmail.com
                    listOfNewspapers: newsPaperList,
                }),
            });
            if (response.status == 200) {
                //create action log for mail sent
                const actionLog = new ActionLog({
                    user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                    islogin: false,
                    rodocref: null, // each allocation doc ref
                    ronumber: null,
                    old_data: {},
                    edited_data: {},
                    user_role,
                    action: 4,
                    message: `Manual Allocation sent  to Deputy Director mail sent to department Successfully to mail id ${to} path: /advertisement${req.path}`,
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
                    adRef: adRef,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                });
                const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            }
            else {
                const actionLog = new ActionLog({
                    user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                    islogin: false,
                    rodocref: null, // each allocation doc ref
                    ronumber: null,
                    old_data: {},
                    edited_data: {},
                    user_role,
                    action: 4,
                    message: `Manual Allocation sent  to Deputy Director mail sent to department Failed to mail id ${to} path: /advertisement${req.path}`,
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
                    adRef: adRef,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                });
                const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            }
            console.log(`Email sent to department`, to, response);
        }
        catch (err) {
            console.error(`Failed to send email to ${to}:`, err.message);
        }
        editedData = { allotednewspapers: result.allotednewspapers };
        logStatus = "success";
        logMessage = `Automatic allocation successful for ${numOfVendors} vendors.`;
        // ✅ Log success
        const actionLogRefs = [];
        for (const { ref: allocRef, payload } of result.successAllocations) {
            const actionLog = new ActionLog({
                user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                islogin: false,
                rodocref: allocRef,
                ronumber: payload.ronumber,
                old_data: oldData,
                edited_data: payload,
                user_role,
                action: 104,
                message: `Manual allocation successful sent to deputy  path: /advertisement${req.path}`,
                status: "Success",
                platform: platform,
                networkip: clientIp || null,
                screen,
                Newspaper_allocation: {
                    Newspaper: allotednewspapers,
                    allotedtime: new Date(),
                    allocation_type: AllocationType.AUTOMATIC,
                    allotedby: user_ref ? doc(db, "Users", user_ref) : null,
                },
                adRef: allocRef,
                actiontime: moment().tz("Asia/Kolkata").toDate(),
            });
            const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            actionLogRefs.push(actionLogRef.id);
        }
        return res.status(200).json({
            success: true,
            message: logMessage,
            updatedAdvertisement: advertisementId,
            allocationsCreated: numOfVendors,
            joballocationData,
            actionLogId: actionLogRefs,
        });
    }
    catch (error) {
        console.error("❌ Transaction failed:", error);
        logStatus = "error";
        logMessage = error.message || "Automatic allocation failed.";
        // Log failure
        for (const alloc of successAllocations) {
            const actionLog = new ActionLog({
                user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
                islogin: false,
                rodocref: alloc.ref || null,
                ronumber: alloc.payload?.ronumber,
                old_data: oldData,
                edited_data: alloc.payload,
                user_role: req.body.user_role || "",
                action: 104,
                message: `Manual allocation failed sent to deputy: ${error.message}  path: /advertisement${req.path}`,
                status: "Failed",
                platform: req.body.platform,
                networkip: clientIp || null,
                screen: req.body.screen,
                Newspaper_allocation: {
                    Newspaper: allotednewspapers,
                    allotedtime: new Date(),
                    allocation_type: AllocationType.MANUAL,
                    allotedby: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
                },
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                adRef: adRef,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog });
        }
        res.status(500).json({ success: false, message: logMessage, error: error.message });
    }
};
function wrapText(text, font, fontSize, maxWidth) {
    if (!text)
        return [""];
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
        const testLine = line ? line + " " + word : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width > maxWidth && line) {
            lines.push(line);
            line = word;
        }
        else {
            line = testLine;
        }
    }
    if (line)
        lines.push(line);
    return lines;
}
/**
 * Generate Advertisement PDF report for a given date range
 */
export const generateAdvertisementReport = async (req, res) => {
    const xForwardedFor = req.headers["x-forwarded-for"];
    const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
    try {
        const { fromDate, toDate } = req.body;
        if (!fromDate || !toDate) {
            return res.status(400).json({ message: "fromDate and toDate are required" });
        }
        // Fetch advertisements in the range
        const fromTs = Timestamp.fromDate(new Date(fromDate));
        const toTs = Timestamp.fromDate(new Date(toDate));
        // console.log("fromTs", fromTs, "toTs", toTs);
        const adsSnapshot = await getDocs(collection(db, "Advertisement"));
        const ads = adsSnapshot.docs
            .map((d) => d.data())
            .filter((ad) => {
            const date = ad.DateOfApproval?.toDate ? ad.DateOfApproval.toDate() : ad.DateOfApproval;
            return date && date >= new Date(fromDate) && date <= new Date(toDate);
        });
        if (ads.length === 0) {
            return res.status(404).json({ message: "No advertisements found in given date range." });
        }
        // Helper to fetch user display names
        const fetchNames = async (refs = []) => {
            const names = [];
            for (const r of refs) {
                try {
                    const docSnap = await getDoc(r);
                    if (docSnap.exists()) {
                        names.push(docSnap.data().display_name || "N/A");
                    }
                }
                catch {
                    names.push("N/A");
                }
            }
            return names;
        };
        const fetchNamesWithRONumber = async (refs = []) => {
            const names = [];
            for (const r of refs) {
                try {
                    const docSnap = await getDoc(r);
                    if (docSnap.exists()) {
                        names.push(docSnap.data().display_name || "N/A");
                    }
                }
                catch {
                    names.push("N/A");
                }
            }
            return names;
        };
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const pageMargin = 40;
        const pageWidth = 595.28; // A4 width
        const pageHeight = 841.89; // A4 height
        const availableWidth = pageWidth - pageMargin * 2;
        // Column layout (flex widths in points)
        const colWidths = [25, 80, 60, 100, 120, 90, 90];
        const startX = pageMargin;
        let y = pageHeight - 70;
        let page = pdfDoc.addPage([pageWidth, pageHeight]);
        const title = "Approved Advertisements - DIPR";
        const today = format(new Date(), "yyyy-MM-dd");
        page.drawText(title, { x: startX, y, size: 14, font: bold, color: rgb(0, 0, 0) });
        page.drawText(`Generated: ${today}`, { x: pageWidth - 150, y, size: 10, font });
        y -= 30;
        const headers = ["Sr", "Ad ID", "Date", "Department", "Alloted To", "Acknowledged By(RO Number)", "Rejected By"];
        const drawRow = (row, yPos, isHeader = false) => {
            let x = startX;
            let maxRowHeight = 0;
            // First pass: compute wrapped text per column
            const wrapped = row.map((text, i) => wrapText(text || "", isHeader ? bold : font, 8, (colWidths[i] ?? 50) - 5));
            // Determine row height (line count × line height)
            for (const lines of wrapped) {
                const height = lines.length * 10;
                if (height > maxRowHeight)
                    maxRowHeight = height;
            }
            // Second pass: draw each column's text
            for (let i = 0; i < row.length; i++) {
                const lines = wrapped[i];
                let textY = yPos;
                for (const line of lines ?? []) {
                    page.drawText(line, {
                        x,
                        y: textY,
                        size: 8,
                        font: isHeader ? bold : font,
                        color: rgb(0, 0, 0),
                    });
                    textY -= 10;
                }
                x += colWidths[i] ?? 0;
            }
            return maxRowHeight + 5; // Return height used
        };
        // Draw header
        drawRow(headers, y, true);
        y -= 20;
        let sr = 1;
        for (const ad of ads) {
            console.log("Processing ad:", ad);
            const alloted = ad.allotednewspapers ? await fetchNames(ad.allotednewspapers) : [];
            const approved = ad.approvednewspaperslocal ? await fetchNames(ad.approvednewspaperslocal) : [];
            const rejected = ad.rejectednewspapers ? await fetchNames(ad.rejectednewspapers) : [];
            const row = [
                sr.toString(),
                ad.AdvertisementId || "",
                ad.DateOfApproval?.toDate ? format(ad.DateOfApproval.toDate(), "dd MMM yyyy") : "",
                ad.Department_name || "",
                alloted.join(", "),
                approved.join(", "),
                rejected.join(", "),
            ];
            const rowHeight = drawRow(row, y);
            y -= rowHeight;
            // New page when reaching bottom
            if (y < 50) {
                page = pdfDoc.addPage([pageWidth, pageHeight]);
                y = pageHeight - 70;
                page.drawText(title, { x: startX, y, size: 14, font: bold });
                page.drawText(`Generated: ${today}`, { x: pageWidth - 150, y, size: 10, font });
                y -= 30;
                drawRow(headers, y, true);
                y -= 20;
            }
            sr++;
        }
        // Save + upload
        const pdfBytes = await pdfDoc.save();
        const storage = getStorage();
        const filePath = `reports/advertisement_report_${uuidv4()}.pdf`;
        const fileRef = ref(storage, filePath);
        await uploadBytes(fileRef, pdfBytes, { contentType: "application/pdf" });
        const downloadURL = await getDownloadURL(fileRef);
        res.status(200).json({
            success: true,
            message: "PDF generated successfully",
            url: downloadURL,
            totalRecords: ads.length,
        });
    }
    catch (error) {
        console.error("❌ Error generating PDF:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
export const getAdvertisementCountByYear = async (req, res) => {
    const { year } = req.params;
    if (!year) {
        return res.status(400).json({ success: false, message: "Year parameter is required" });
    }
    try {
        const startDate = new Date(`${year}-01-01T00:00:00Z`);
        const endDate = new Date(`${year}-12-31T23:59:59Z`);
        const querySnapshot = await getDocs(query(collection(db, "Advertisement"), where("createdAt", ">=", Timestamp.fromDate(startDate)), where("createdAt", "<=", Timestamp.fromDate(endDate))));
        const count = querySnapshot.size;
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ];
        const monthQueries = monthNames.map((month, i) => {
            const start = new Date(Date.UTC(Number(year), i, 1, 0, 0, 0));
            const end = new Date(Date.UTC(Number(year), i + 1, 0, 23, 59, 59)); // handles variable month length automatically
            return getDocs(query(collection(db, "Advertisement"), where("createdAt", ">=", Timestamp.fromDate(start)), where("createdAt", "<=", Timestamp.fromDate(end)))).then((snap) => ({
                month,
                count: snap.size,
            }));
        });
        const monthlyData = await Promise.all(monthQueries);
        // console.log(`Year ${year}: Total advertisements = ${count}`, monthlyData);
        res.status(200).json({ success: true, year, count, monthlyData });
    }
    catch (error) {
        console.error("❌ Error fetching advertisement count:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
export const deputyApproveAdvertisement = async (req, res) => {
    const { advertisementId, user_ref, user_role, platform, screen, } = req.body;
    const adRef = doc(db, "Advertisement", advertisementId);
    const xForwardedFor = req.headers["x-forwarded-for"];
    const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
    try {
        const ad = await getDoc(adRef);
        if (!ad.exists()) {
            return res.status(404).json({ success: false, message: "Advertisement not found" });
        }
        const data = ad.data();
        await updateDoc(adRef, {
            allotednewspapers: data.caseworkerdraftnewspapers || [],
            IsrequesPending: false,
            Status_Deputy: 2,
            approved: true,
            DateOfApproval: serverTimestamp(),
            approvedstatus: 1,
            RODATE: serverTimestamp(),
        });
        const updatedSnap = await getDoc(adRef);
        const updatedData = updatedSnap.data();
        // create action Log
        const actionLog = new ActionLog({
            user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
            islogin: false,
            rodocref: null,
            ronumber: null,
            old_data: data,
            edited_data: updatedData ?? {},
            user_role: req.body.user_role || "",
            action: 6,
            message: `Advertisement approved by Deputy updated Advertisement Document path: /advertisement${req.path}`,
            status: "Success",
            platform: req.body.platform,
            networkip: clientIp || null,
            screen: req.body.screen,
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null,
            },
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            adRef: adRef.id ? doc(db, "Advertisement", adRef.id) : null,
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLog });
        const ListOfNewsPapperJobAllocationDocRef = [];
        const jobAllocSnap = await getDocs(query(collection(db, "NewspaperJobAllocation"), where("adref", "==", adRef)));
        jobAllocSnap.forEach((doc) => {
            ListOfNewsPapperJobAllocationDocRef.push(doc.ref);
        });
        const notifications = [];
        const notificationApproved = [];
        const newsPaperList = [];
        for (const docRef of ListOfNewsPapperJobAllocationDocRef) {
            const oldSnap = await getDoc(docRef);
            const old_data = oldSnap.data();
            await updateDoc(docRef, {
                aprovedcw: true,
                timeofallotment: serverTimestamp(),
                completed: false,
                invoiceraised: false,
            });
            const newSnap = await getDoc(docRef);
            const new_data = newSnap.data();
            // create action Log
            const actionLog = new ActionLog({
                user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
                islogin: false,
                rodocref: docRef.id ? doc(db, "NewspaperJobAllocation", docRef.id) : null,
                ronumber: null,
                old_data: old_data ?? {},
                edited_data: new_data ?? {},
                user_role: req.body.user_role || "",
                action: 8,
                message: `Advertisement approved by Deputy updated NewspaperJobAllocation Document path: /advertisement${req.path}`,
                status: "Success",
                platform: req.body.platform,
                networkip: clientIp || null,
                screen: req.body.screen,
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null,
                },
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                adRef: adRef.id ? doc(db, "Advertisement", adRef.id) : null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog });
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
                        const paperName = userData.display_name;
                        if (paperName) {
                            newsPaperList.push(paperName);
                        }
                        if (userEmail && roNumber) {
                            notifications.push({
                                to: userEmail,
                                roNumber,
                                addressTo: "Technical Assistant",
                                allocationRef: docRef,
                            });
                            notificationApproved.push({
                                roNumber,
                                result: "approved",
                                resultComment: "and sent for approval to the vendor.",
                                allocationRef: docRef,
                            });
                        }
                    }
                }
            }
        }
        // Send mail to users
        for (const mail of notifications) {
            try {
                const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/release-order`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(mail),
                });
                if (response.status == 200) {
                    //create action log for mail sent
                    const actionLog = new ActionLog({
                        user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                        islogin: false,
                        rodocref: mail.allocationRef, // each allocation doc ref
                        ronumber: mail.roNumber,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Deputy Approve Advertisement mail sent to vendors Successfully to mail id ${mail.to} path: /advertisement${req.path}`,
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
                        adRef: adRef,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                }
                else {
                    const actionLog = new ActionLog({
                        user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                        islogin: false,
                        rodocref: mail.allocationRef, // each allocation doc ref
                        ronumber: mail.roNumber,
                        old_data: {},
                        edited_data: {},
                        user_role,
                        action: 4,
                        message: `Deputy Approve Advertisement mail sent to vendors Failed to mail id ${mail.to} path: /advertisement${req.path} `,
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
                        adRef: adRef,
                        actiontime: moment().tz("Asia/Kolkata").toDate(),
                    });
                    const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                }
                console.log(`Email sent to ${mail.to}`);
            }
            catch (err) {
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
                    const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/accepting`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            to: toMail,
                            roNumber: mail.roNumber,
                            result: mail.result,
                            resultComment: mail.resultComment,
                        }),
                    });
                    if (response.status == 200) {
                        //create action log for mail sent
                        const actionLog = new ActionLog({
                            user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                            islogin: false,
                            rodocref: mail.allocationRef, // each allocation doc ref
                            ronumber: mail.roNumber,
                            old_data: {},
                            edited_data: {},
                            user_role,
                            action: 4,
                            message: `Deputy Approve Advertisement Accepting email  sent to vendors Successfully to mail id ${toMail}  path: /advertisement${req.path}`,
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
                            adRef: adRef,
                            actiontime: moment().tz("Asia/Kolkata").toDate(),
                        });
                        const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                    }
                    else {
                        const actionLog = new ActionLog({
                            user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                            islogin: false,
                            rodocref: mail.allocationRef, // each allocation doc ref
                            ronumber: mail.roNumber,
                            old_data: {},
                            edited_data: {},
                            user_role,
                            action: 4,
                            message: `Deputy Approve Advertisement Accepting email  sent to vendors Failed to mail id ${toMail} path: /advertisement${req.path} `,
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
                            adRef: adRef,
                            actiontime: moment().tz("Asia/Kolkata").toDate(),
                        });
                        const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
                    }
                    console.log(`Accepting email sent to ${toMail} for RO ${mail.roNumber}`);
                }
                catch (err) {
                    console.error(`Failed to send accepting email to ${toMail}:`, err.message);
                }
            }
        }
        // Send mail to department
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/informDept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: data.Bearingno,
                    // to: "jayanthbr@digi9.co.in",
                    advertisementNumber: data.AdvertisementId,
                    // cc: "diprarunx@gmail.com,diprarunpub@gmail.com",
                    cc: "diprarunadvt@gmail.com", //diprarunx@gmail.com,diprarunpub@gmail.com
                    listOfNewspapers: newsPaperList,
                }),
            });
            if (response.status == 200) {
                //create action log for mail sent
                const actionLog = new ActionLog({
                    user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                    islogin: false,
                    rodocref: null, // each allocation doc ref
                    ronumber: null,
                    old_data: {},
                    edited_data: {},
                    user_role,
                    action: 4,
                    message: `Deputy Approve Advertisementsent mail to department Successfully to mail id ${data.Bearingno} path: /advertisement${req.path}`,
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
                    adRef: adRef,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                });
                const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            }
            else {
                const actionLog = new ActionLog({
                    user_ref: user_ref ? doc(db, "Users", user_ref) : null,
                    islogin: false,
                    rodocref: null, // each allocation doc ref
                    ronumber: null,
                    old_data: {},
                    edited_data: {},
                    user_role,
                    action: 4,
                    message: `Deputy Approve Advertisement mail sent to department Failed to mail id ${data.Bearingno} path: /advertisement${req.path}`,
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
                    adRef: adRef,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                });
                const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            }
            console.log(`Email sent to department`, data.Bearingno);
        }
        catch (err) {
            console.error(`Failed to send email to ${data.Bearingno}:`, err.message);
        }
        //create Action log
        const actionLogSuccess = new ActionLog({
            user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
            islogin: false,
            rodocref: null,
            ronumber: null,
            old_data: {},
            edited_data: {},
            user_role: req.body.user_role || "",
            action: 200,
            message: `Advertisement approved by Deputy Successfully path: /advertisement${req.path}`,
            status: "Success",
            platform: req.body.platform,
            networkip: clientIp || null,
            screen: req.body.screen,
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null,
            },
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            adRef: adRef.id ? doc(db, "Advertisement", adRef.id) : null,
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess });
        res.status(200).json({ success: true, message: "Advertisement approved and notifications sent.", Adevertisement: data, notifications, notificationApproved, ListOfNewsPapperJobAllocationDocRef });
    }
    catch (error) {
        // create action Log
        const actionLog = new ActionLog({
            user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
            islogin: false,
            rodocref: null,
            ronumber: null,
            old_data: {},
            edited_data: {},
            user_role: req.body.user_role || "",
            action: 200,
            message: `Error while approving advertisement: ${error.message} path: /advertisement${req.path}`,
            status: "Failed",
            platform: req.body.platform,
            networkip: clientIp || null,
            screen: req.body.screen,
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null,
            },
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            adRef: adRef,
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLog });
        console.error("❌ Error approving advertisement:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
export const deputyPullBackAction = async (req, res) => {
    const { advertisementId, user_ref, user_role, platform, screen } = req.body;
    const adRef = doc(db, "Advertisement", advertisementId);
    const xForwardedFor = req.headers["x-forwarded-for"];
    const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
    try {
        const ad = await getDoc(adRef);
        if (!ad.exists()) {
            return res.status(404).json({ success: false, message: "Advertisement not found" });
        }
        const data = ad.data();
        await updateDoc(adRef, {
            allotednewspapers: [],
            IsrequesPending: false,
            Status_Deputy: 0,
            approved: false,
            caseworkerdraftnewspapers: data.allotednewspapers,
        });
        const updatedSnap = await getDoc(adRef);
        const updatedData = updatedSnap.data();
        // create action Log
        const actionLog = new ActionLog({
            user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
            islogin: false,
            rodocref: null,
            ronumber: null,
            old_data: data,
            edited_data: updatedData ?? {},
            user_role: req.body.user_role || "",
            action: 6,
            message: `PullBack operation performed by Deputy on advertisement: ${advertisementId} path: /advertisement${req.path}`,
            status: "Success",
            platform: req.body.platform,
            networkip: clientIp || null,
            screen: req.body.screen,
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null,
            },
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            adRef: adRef.id ? doc(db, "Advertisement", adRef.id) : null,
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLog });
        const ListOfNewsPapperJobAllocationDocRef = [];
        const jobAllocSnap = await getDocs(query(collection(db, "NewspaperJobAllocation"), where("adref", "==", adRef)));
        jobAllocSnap.forEach((doc) => {
            ListOfNewsPapperJobAllocationDocRef.push(doc.ref);
        });
        const notifications = [];
        const notificationApproved = [];
        const newsPaperList = [];
        for (const docRef of ListOfNewsPapperJobAllocationDocRef) {
            const oldSnap = await getDoc(docRef);
            const old_data = oldSnap.data();
            await updateDoc(docRef, {
                aprovedcw: false,
                completed: false,
            });
            const newSnap = await getDoc(docRef);
            const new_data = newSnap.data();
            // create action Log
            const actionLog = new ActionLog({
                user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
                islogin: false,
                rodocref: docRef.id ? doc(db, "NewspaperJobAllocation", docRef.id) : null,
                ronumber: null,
                old_data: old_data ?? {},
                edited_data: new_data ?? {},
                user_role: req.body.user_role || "",
                action: 8,
                message: `PullBack operation performed by Deputy on advertisement: ${advertisementId} and NewspaperJobAllocation: ${docRef.id} path: /advertisement${req.path}`,
                status: "Success",
                platform: req.body.platform,
                networkip: clientIp || null,
                screen: req.body.screen,
                Newspaper_allocation: {
                    Newspaper: [],
                    allotedtime: null,
                    allocation_type: null,
                    allotedby: null,
                },
                actiontime: moment().tz("Asia/Kolkata").toDate(),
                adRef: adRef.id ? doc(db, "Advertisement", adRef.id) : null,
            });
            await addDoc(collection(db, "actionLogs"), { ...actionLog });
        }
        //create action logs
        const actionLogSuccess = new ActionLog({
            user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
            islogin: false,
            rodocref: null,
            ronumber: null,
            old_data: {},
            edited_data: {},
            user_role: req.body.user_role || "",
            action: 202,
            message: ` PullBack operation performed by Deputy on advertisement is successfully: ${advertisementId} path: /advertisement${req.path}`,
            status: "Success",
            platform: req.body.platform,
            networkip: clientIp || null,
            screen: req.body.screen,
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null,
            },
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            adRef: adRef,
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess });
        res.status(200).json({
            success: true,
            message: "PullBack operation performed successfully",
            data: updatedData
        });
    }
    catch (error) {
        const actionLog = new ActionLog({
            user_ref: req.body.user_ref ? doc(db, "Users", req.body.user_ref) : null,
            islogin: false,
            rodocref: null,
            ronumber: null,
            old_data: {},
            edited_data: {},
            user_role: req.body.user_role || "",
            action: 202,
            message: `Error while performing PullBack operation performed by Deputy on advertisement: ${error.message} path: /advertisement${req.path}`,
            status: "Failed",
            platform: req.body.platform,
            networkip: clientIp || null,
            screen: req.body.screen,
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null,
            },
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            adRef: adRef,
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLog });
        console.error("❌ Error approving advertisement:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
export const deputyRejectAdvertisement = async (req, res) => {
    const { advertisementId, Feedback, user_id, user_role, platform, screen } = req.body;
    // console.dir(req.body, { depth: null });
    const xForwardedFor = req.headers["x-forwarded-for"];
    const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
    //read document from user collection
    const userRef = doc(db, "Users", user_id);
    const userSnapshot = await getDoc(userRef);
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
    try {
        //read advertisement document
        const adRef = doc(db, "Advertisement", advertisementId);
        const adSnap = await getDoc(adRef);
        if (!adSnap.exists()) {
            return res.status(404).json({ success: false, message: "Advertisement not found" });
        }
        const data = adSnap.data();
        if (!data) {
            return res.status(404).json({ success: false, message: "Advertisement not found" });
        }
        //update advertisement
        await updateDoc(adRef, {
            Feedback: Feedback,
            Status_Deputy: 3,
            IsrequesPending: false,
            Status_Caseworker: 3,
            DateOfRejection: serverTimestamp(),
        });
        const updatedData = (await getDoc(adRef)).data();
        //create action log
        const actionLog = new ActionLog({
            user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
            islogin: false,
            rodocref: null,
            ronumber: null,
            docrefinvoice: null,
            old_data: data || {},
            edited_data: updatedData || {},
            user_role,
            action: 6,
            message: `Advertisement Rejected by Deputy updated Advertisement document path: /advertisement${req.path}`,
            status: "Success",
            platform: platform,
            networkip: clientIp || null,
            screen: screen,
            adRef: adRef,
            actiontime: moment().tz("Asia/Kolkata").toDate(),
            Newspaper_allocation: {
                Newspaper: [],
                allotedtime: null,
                allocation_type: null,
                allotedby: null
            },
            note_sheet_allocation: null,
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLog });
        //mail send for acceptOrder
        const usersEmailSnap = await getDocs(collection(db, "UsersEmail"));
        const userEmailDocSnap = usersEmailSnap.docs[0];
        if (!userEmailDocSnap) {
            throw new Error("UsersEmail document does not exist");
        }
        const usersEmailData = userEmailDocSnap.data();
        let toMail = usersEmailData["technicalassistantadvtgmailcom"];
        if (!toMail) {
            return res.status(404).json({
                success: false,
                message: "Email not found",
            });
        }
        try {
            const response = await fetch(`${process.env.NODEMAILER_BASE_URL}/email/accepting`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: toMail,
                    // to: "jayanthbr@digi9.co.in",
                    roNumber: data.AdvertisementId,
                    result: "rejected.",
                    resultComment: `Feedback : ${Feedback}`,
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
                    message: `Advertisement Approved by Deputy mail sent successfully to department  ${toMail} path: /advertisement${req.path}`,
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
                    adRef: adRef,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                    note_sheet_allocation: null,
                });
                const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            }
            else {
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
                    message: `Advertisement Approved by Deputy mail failed to send to department ${toMail} path: /advertisement${req.path}`,
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
                    adRef: adRef,
                    actiontime: moment().tz("Asia/Kolkata").toDate(),
                    note_sheet_allocation: null,
                });
                const actionLogRef = await addDoc(collection(db, "actionLogs"), { ...actionLog });
            }
        }
        catch (error) {
            console.error("Error sending email:", error);
        }
        // create action log
        const actionLogSuccess = new ActionLog({
            user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
            islogin: false,
            rodocref: null,
            ronumber: null,
            docrefinvoice: null,
            old_data: {},
            edited_data: {},
            user_role,
            action: 201,
            message: `Advertisement Rejected by Deputy Successfully path: /advertisement${req.path}`,
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
            note_sheet_allocation: null,
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLogSuccess });
        res.status(200).json({ success: true, message: "Advertisement approved successfully", data: updatedData });
    }
    catch (error) {
        // create action log
        const actionLog = new ActionLog({
            user_ref: req.body.user_id ? doc(db, "Users", req.body.user_id) : null,
            islogin: false,
            rodocref: null,
            ronumber: null,
            docrefinvoice: null,
            old_data: {},
            edited_data: {},
            user_role,
            action: 201,
            message: `Advertisement Rejected by Deputy failed  Error: ${error.message} path: /advertisement${req.path}`,
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
            note_sheet_allocation: null,
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLog });
        console.error("❌ Error approving advertisement:", error);
        res.status(500).json({ success: false, message: "Error approving advertisement", error: error });
    }
};
//# sourceMappingURL=advertisementController.js.map