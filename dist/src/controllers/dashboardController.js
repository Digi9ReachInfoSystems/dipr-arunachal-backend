import { collection, doc, addDoc, getDocs, getDoc, deleteDoc, Timestamp, where, query, orderBy, QueryConstraint, } from "firebase/firestore";
import db from "../configs/firebase.js";
import { AppError, handleError } from "../utils/errorHandler.js";
export const getDashboardStats = async (req, res) => {
    try {
        const usersRef = collection(db, "Users");
        const advertisementRef = collection(db, "Advertisement");
        const adminDataRef = collection(db, "admindata");
        const approved_addRef = collection(db, "approved_add");
        const usersSnapshot = await getDocs(query(usersRef));
        const usersWithoutVendorField = usersSnapshot.docs.filter(doc => !('isVendor' in doc.data()));
        const vendorSnapshot = await getDocs(query(usersRef, where("isVendor", "==", true)));
        const advertisementSnapshot = await getDocs(advertisementRef);
        const adminDataSnapshot = await getDocs(adminDataRef);
        const approved_addSnapshot = await getDocs(approved_addRef);
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
//# sourceMappingURL=dashboardController.js.map