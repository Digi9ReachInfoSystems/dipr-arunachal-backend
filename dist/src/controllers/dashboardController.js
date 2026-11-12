import { collection, doc, addDoc, getDocs, getDoc, deleteDoc, Timestamp, where, query, orderBy, QueryConstraint, } from "firebase/firestore";
import db from "../configs/firebase.js";
import { AppError, handleError } from "../utils/errorHandler.js";
import { countDocs } from "../utils/countDocs.js";
import axios from "axios";
export const getDashboardStats = async (req, res) => {
    try {
        const usersRef = collection(db, "Users");
        const advertisementRef = collection(db, "Advertisement");
        const adminDataRef = collection(db, "admindata");
        const approved_addRef = collection(db, "approved_add");
        // Users still needs full docs: "isVendor field missing" can't be expressed as a count query
        const [usersSnapshot, vendorSnapshot, advertisementSnapshot, adminDataSnapshot, approved_addSnapshot] = await Promise.all([
            getDocs(query(usersRef)),
            countDocs(query(usersRef, where("isVendor", "==", true))),
            countDocs(advertisementRef),
            getDocs(adminDataRef),
            countDocs(approved_addRef),
        ]);
        const usersWithoutVendorField = usersSnapshot.docs.filter(doc => !('isVendor' in doc.data()));
        const totalUsers = usersWithoutVendorField.length;
        const totalVendors = vendorSnapshot.size;
        const totalRo = advertisementSnapshot.size;
        const remainingBudget = adminDataSnapshot.docs[0]?.data()?.Budget || 0;
        const totalNoteSheets = approved_addSnapshot.size;
        res.status(200).json({ totalUsers, totalVendors, totalRo, remainingBudget, totalNoteSheets });
    }
    catch (error) {
        console.error("Error in getDashboardStats:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
export const getDetailsByIp = async (req, res) => {
    try {
        const { ip } = req.params;
        if (!ip) {
            return res.status(400).json({ message: "IP address is required" });
        }
        const response = await axios.get(`https://freegeoip.app/json/${ip}`);
        res.status(200).json(response.data);
    }
    catch (error) {
        console.error("Error in getDetailsByIp:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
//# sourceMappingURL=dashboardController.js.map