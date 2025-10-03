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
    addDoc,
} from "firebase/firestore";
import moment from "moment-timezone";
import db from "../configs/firebase.js";
import Advertisement, { type AdvertisementProps } from "../models/advertisementModel.js";


export const createAdvertisement = async (req: Request, res: Response) => {
    try {


        if (req.body.approvednewspaperslocal && req.body.approvednewspaperslocal.length > 0) {
            req.body.approvednewspaperslocal = req.body.approvednewspaperslocal
                .map((ref: string) => {
                    if (ref && typeof ref === "string") {
                        const collectionData = ref.split("/");
                        if (collectionData.length > 2 && collectionData[1] && collectionData[2]) {
                            return doc(db, collectionData[1], collectionData[2]);
                        }
                    } else { return null; }
                })

        }
        if(req.body.DateOfApplication){
            req.body.DateOfApplication = req.body.DateOfApplication ? new Date(req.body.DateOfApplication) : null;
        }
        if(req.body.DateOfApproval){
            req.body.DateOfApproval = req.body.DateOfApproval ? new Date(req.body.DateOfApproval) : null;
        }
        if(req.body.RODATE){
            req.body.RODATE = req.body.RODATE ? new Date(req.body.RODATE) : null;
        }
        if(req.body.publicationdateList && req.body.publicationdateList.length > 0){
            req.body.publicationdateList = req.body.publicationdateList.map((dateStr: string) => new Date(dateStr));
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

    } catch (error) {
        console.error("Error in createReleaseOrder:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const getAdvertisementById = async (req: Request, res: Response) => {
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
    } catch (error) {
        console.error("Error in getReleaseOrderById:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}