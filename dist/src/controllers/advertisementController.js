import { getFirestore, doc, getDoc, writeBatch, serverTimestamp, getDocs, collection, DocumentReference, addDoc, updateDoc } from "firebase/firestore";
import moment from "moment-timezone";
import db from "../configs/firebase.js";
import Advertisement, {} from "../models/advertisementModel.js";
export const createAdvertisement = async (req, res) => {
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
        return res.status(201).json({
            success: true,
            id: docRef.id,
            data: payload,
        });
    }
    catch (error) {
        console.error("Error in createReleaseOrder:", error);
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
export const saveDraftAdvertisement = async (req, res) => {
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
                return null;
            })
                .filter((r) => r !== null);
        }
        if (req.body.DateOfApplication) {
            req.body.DateOfApplication = new Date(req.body.DateOfApplication);
        }
        if (req.body.RODATE) {
            req.body.RODATE = new Date(req.body.RODATE);
        }
        if (req.body.publicationdateList && req.body.publicationdateList.length > 0) {
            req.body.publicationdateList = req.body.publicationdateList.map((dateStr) => new Date(dateStr));
        }
        let body = req.body;
        const ad = new Advertisement(body);
        const payload = {
            AdvertisementId: ad.AdvertisementId,
            DateOfApplication: ad.DateOfApplication || serverTimestamp(),
            Subject: ad.Subject,
            AddressTo: ad.AddressTo,
            TypeOfAdvertisement: ad.TypeOfAdvertisement,
            Is_CaseWorker: ad.Is_CaseWorker || false,
            Is_Deputy: ad.Is_Deputy || false,
            Is_fao: ad.Is_fao || false,
            Is_Vendor: ad.Is_Vendor || false,
            Status_Caseworker: ad.Status_Caseworker || 0,
            Status_Deputy: ad.Status_Deputy || 0,
            Status_Fao: ad.Status_Fao || 0,
            Status_Vendor: ad.Status_Vendor || 0,
            Bearingno: ad.Bearingno,
            Insertion: ad.Insertion,
            Department_name: ad.Department_name,
            type_face_size: ad.type_face_size,
            isDarft: true,
            ListofPdf: ad.ListofPdf || [],
            isnational: ad.isnational || false,
            isbothnationalandlocal: ad.isbothnationalandlocal || false,
            approvednewspaperslocal: ad.approvednewspaperslocal || [],
            RegionalNewspaper: ad.RegionalNewspaper || false,
            localnewspapers: ad.localnewspapers || false,
            RODATE: ad.RODATE || null,
            Bill_to: ad.Bill_to,
            Edition: ad.Edition,
            publicationdateList: ad.publicationdateList || [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, "Advertisement"), payload);
        return res.status(201).json({
            success: true,
            id: docRef.id,
            data: payload,
        });
    }
    catch (error) {
        console.error("Error in saveDraftAdvertisement:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
export const editAdvertisement = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "Document ID is required" });
        }
        const updatePayload = {};
        if (req.body.AdvertisementId)
            updatePayload.AdvertisementId = req.body.AdvertisementId;
        if (req.body.DateOfApplication)
            updatePayload.DateOfApplication = new Date(req.body.DateOfApplication);
        if (req.body.Subject)
            updatePayload.Subject = req.body.Subject;
        if (req.body.AddressTo)
            updatePayload.AddressTo = req.body.AddressTo;
        if (req.body.TypeOfAdvertisement)
            updatePayload.TypeOfAdvertisement = req.body.TypeOfAdvertisement;
        if (req.body.Bearingno)
            updatePayload.Bearingno = req.body.Bearingno;
        if (req.body.Department_name)
            updatePayload.Department_name = req.body.Department_name;
        if (typeof req.body.isnational === "boolean")
            updatePayload.isnational = req.body.isnational;
        if (typeof req.body.isbothnationalandlocal === "boolean")
            updatePayload.isbothnationalandlocal = req.body.isbothnationalandlocal;
        if (typeof req.body.RegionalNewspaper === "boolean")
            updatePayload.RegionalNewspaper = req.body.RegionalNewspaper;
        if (typeof req.body.localnewspapers === "boolean")
            updatePayload.localnewspapers = req.body.localnewspapers;
        if (req.body.Bill_to)
            updatePayload.Bill_to = req.body.Bill_to;
        if (req.body.Edition)
            updatePayload.Edition = req.body.Edition;
        updatePayload.updatedAt = serverTimestamp();
        const docRef = doc(collection(db, "Advertisement"), id);
        await updateDoc(docRef, updatePayload);
        return res.status(200).json({
            success: true,
            message: "Advertisement updated successfully",
            id,
            data: updatePayload,
        });
    }
    catch (error) {
        console.error("Error in editAdvertisement:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
//# sourceMappingURL=advertisementController.js.map