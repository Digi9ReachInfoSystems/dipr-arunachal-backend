import { getFirestore, doc, getDoc, writeBatch, serverTimestamp, getDocs, collection, DocumentReference, Timestamp, query, where } from "firebase/firestore";
import moment from "moment-timezone";
import db from "../configs/firebase.js";
export const getInvoiceRequestCount = async (req, res) => {
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
        const querySnapshot = await getDocs(query(collection(db, "Invoice_Request"), where("DateOfInvoice", ">=", Timestamp.fromDate(startDate)), where("DateOfInvoice", "<=", Timestamp.fromDate(endDate))));
        const count = querySnapshot.size;
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ];
        const monthQueries = monthNames.map((month, i) => {
            const start = new Date(Date.UTC(Number(year), i, 1, 0, 0, 0));
            const end = new Date(Date.UTC(Number(year), i + 1, 0, 23, 59, 59)); // handles variable month length automatically
            return getDocs(query(collection(db, "Invoice_Request"), where("DateOfInvoice", ">=", Timestamp.fromDate(start)), where("DateOfInvoice", "<=", Timestamp.fromDate(end)))).then((snap) => ({
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
//# sourceMappingURL=InvoiceRequestController.js.map