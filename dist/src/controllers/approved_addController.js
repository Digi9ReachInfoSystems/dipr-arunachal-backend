import { getFirestore, doc, getDoc, writeBatch, serverTimestamp, getDocs, collection, DocumentReference, Timestamp, query, where, updateDoc, setDoc, addDoc } from "firebase/firestore";
import moment from "moment-timezone";
import db from "../configs/firebase.js";
import ActionLog from "../models/actionLogModel.js";
export const getApproveAddCount = async (req, res) => {
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
        const querySnapshot = await getDocs(query(collection(db, "approved_add"), where("dateTimeAssistant", ">=", Timestamp.fromDate(startDate)), where("dateTimeAssistant", "<=", Timestamp.fromDate(endDate))));
        const count = querySnapshot.size;
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ];
        const monthQueries = monthNames.map((month, i) => {
            const start = new Date(Date.UTC(Number(year), i, 1, 0, 0, 0));
            const end = new Date(Date.UTC(Number(year), i + 1, 0, 23, 59, 59)); // handles variable month length automatically
            return getDocs(query(collection(db, "approved_add"), where("dateTimeAssistant", ">=", Timestamp.fromDate(start)), where("dateTimeAssistant", "<=", Timestamp.fromDate(end)))).then((snap) => ({
                month,
                count: snap.size,
            }));
        });
        const monthlyData = await Promise.all(monthQueries);
        // console.log(`Year ${year}: Total advertisements = ${count}`, monthlyData);
        res.status(200).json({ success: true, year, count, monthlyData });
    }
    catch (error) {
        console.error("Error in Invoice_Request count:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch count",
            error: error.message,
        });
    }
};
export const createNoteSheet = async (req, res) => {
    const { userref, approvedList, totalamount, assitantFeedback, user_id, user_role, platform, screen } = req.body;
    try {
        //pepare userRef and get userDetails
        const collectionData = userref.split("/");
        let UserRef = null;
        if (collectionData && collectionData.length > 2) {
            UserRef = doc(db, collectionData[1], collectionData[2]);
        }
        if (!UserRef) {
            return res.status(400).json({
                success: false,
                message: "Invalid user reference",
            });
        }
        const userSnapshot = await getDoc(UserRef);
        if (!userSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const userData = userSnapshot.data();
        //Get First Document of adminData collection to get admin Id
        const adminRef = doc(db, "adminData");
        const adminSnapshot = await getDoc(adminRef);
        if (!adminSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }
        const adminData = adminSnapshot.data();
        const noteSheetNo = adminData.notesheetno;
        //create document in approved_add collection
        const approved_addCollection = collection(db, "approved_add");
        const approved_addRef = doc(approved_addCollection);
        let division;
        let invoice;
        switch (user_role) {
            case "IsLdc1":
                division = 1;
                invoice = 'UDC - 2';
                break;
            case "IsLdc2":
                division = 2;
                invoice = 'LDC - 1';
                break;
            default:
                invoice = 'UDC - 1';
                division = 3;
                break;
        }
        await setDoc(approved_addRef, {
            adddata: approvedList,
            deputyStatus: 0,
            assitantStattus: 3,
            assitantFeedback: assitantFeedback,
            TotalAmount: totalamount,
            ispending: true,
            dateofAproval: serverTimestamp(),
            division: division,
            notesheetString: `NS/DIPR-${noteSheetNo}`,
            directorStatus: 10,
            FaoStatus: 10,
            statusSecretary: 10,
            dateTimeAssistant: serverTimestamp(),
            userref: UserRef,
            statusUnderSecretary: 10,
            notesheetdetails: [{
                    createddate: serverTimestamp(),
                    feedback: assitantFeedback,
                    userrole: userData.display_name
                }]
        });
        //create actio log
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
            action: 18,
            message: "NoteSheet Created new document created in approved_add collection",
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
            note_sheet_allocation: approved_addRef || null,
        });
        await addDoc(collection(db, "actionLogs"), { ...actionLog });
        // create document in bugdetDetails collection
        const budgetDetailsCollection = collection(db, "budgetDetails");
        const budgetDetailsRef = doc(budgetDetailsCollection);
        await setDoc(budgetDetailsRef, {
            amountDeducted: totalamount,
            date: serverTimestamp(),
            invoiceRoNumber: `NS/DIPR-${noteSheetNo}`,
            invoice: invoice,
            total: adminData.Budget,
        });
        //Increment admin notesheet number
        await updateDoc(adminRef, {
            notesheetno: noteSheetNo + 1
        });
        const updatedData = (await getDoc(adminRef)).data();
        //create action log
        res.status(200).json({ success: true, notesheetno: noteSheetNo });
    }
    catch (error) {
        console.error("Error in Invoice_Request count:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch count",
            error: error.message,
        });
    }
};
//# sourceMappingURL=approved_addController.js.map