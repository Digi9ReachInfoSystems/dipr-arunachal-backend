// controllers/actionLogController.ts
import type { Request, Response } from "express";
import ActionLog from "../models/actionLogModel.js";
import db from "../configs/firebase.js";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  Timestamp,
  where,
  query,
  orderBy,
  QueryConstraint,
} from "firebase/firestore";
import { AppError, handleError } from "../utils/errorHandler.js";

const actionLogsRef = collection(db, "actionLogs");

// ✅ Create ActionLog
export const createActionLog = async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (body.platform && !["iOS", "Android", "Web"].includes(body.platform)) {
      throw new AppError("Invalid platform type", 422, {
        allowed: ["iOS", "Android", "Web"],
      });
    }

    if (
      body.Newspaper_allocation?.allocation_type &&
      !["Manual", "Automatic"].includes(body.Newspaper_allocation.allocation_type)
    ) {
      throw new AppError("Invalid allocation type", 422, {
        allowed: ["Manual", "Automatic"],
      });
    }

    // Convert document references from string paths
    if (body.user_ref) {
      const collectionData = body.user_ref.split("/");
      body.user_ref =
        collectionData.length > 2 ? doc(db, collectionData[1], collectionData[2]) : null;
    }

    if (body.rodocref) {
      const collectionData = body.rodocref.split("/");
      body.rodocref =
        collectionData.length > 2 ? doc(db, collectionData[1], collectionData[2]) : null;
    }

    if (body.docrefinvoice) {
      const collectionData = body.docrefinvoice.split("/");
      body.docrefinvoice =
        collectionData.length > 2 ? doc(db, collectionData[1], collectionData[2]) : null;
    }

    if (body.Newspaper_allocation?.allotedby) {
      const collectionData = body.Newspaper_allocation.allotedby.split("/");
      body.Newspaper_allocation.allotedby =
        collectionData.length > 2 ? doc(db, collectionData[1], collectionData[2]) : null;
    }

    // Convert string → Date
    if (body.actiontime && typeof body.actiontime === "string") {
      body.actiontime = new Date(body.actiontime);
    }
    if (
      body.Newspaper_allocation?.allotedtime &&
      typeof body.Newspaper_allocation.allotedtime === "string"
    ) {
      body.Newspaper_allocation.allotedtime = new Date(body.Newspaper_allocation.allotedtime);
    }
    if (body.newspaper_job_allocation) {
      const collectionData = body.newspaper_job_allocation.split("/");
      body.newspaper_job_allocation =
        collectionData.length > 2 ? doc(db, collectionData[1], collectionData[2]) : null;
    }
    if (body.note_sheet_allocation) {
      const collectionData = body.note_sheet_allocation.split("/");
      body.note_sheet_allocation =
        collectionData.length > 2 ? doc(db, collectionData[1], collectionData[2]) : null;
    }

    const log = new ActionLog(body);
    log.networkip = req.ip || null;

    const docRef = await addDoc(actionLogsRef, { ...log });
    res.status(201).json({ success: true, message: "ActionLog created", id: docRef.id });
  } catch (error: Error | any) {
    console.error(error);
    handleError(res, error);
  }
};

// ✅ Get All ActionLogs with filters + pagination
export const getAllActionLogs = async (req: Request, res: Response) => {
  try {
    const {
      user_ref,
      islogin,
      rodocref,
      user_role,
      action,
      status,
      platform,
      screen,
      allocation_type,
      actionDate,
      email,
      note_sheet_allocation,
      docrefinvoice,
      page = 1,
      limit = 10,
    } = req.query;

    const constraints: QueryConstraint[] = [];

    if (user_ref && user_ref !== "All") {
      let collectionData: string[] = [];
      let userRef: any = null;

      if (typeof user_ref === "string") collectionData = user_ref.split("/");

      if (collectionData.length > 2 && collectionData[1] && collectionData[2]) {
        userRef = doc(db, collectionData[1], collectionData[2]);
        // console.log("✅ User document reference:", userRef.path);
        constraints.push(where("user_ref", "==", userRef));
      } else {
        console.warn("⚠️ Invalid user_ref format:", user_ref);
      }
    }
    if (note_sheet_allocation && note_sheet_allocation !== "All") {
      let collectionData: string[] = [];
      let noteSheetRef: any = null;

      if (typeof note_sheet_allocation === "string")
        collectionData = note_sheet_allocation.split("/");

      if (collectionData.length > 2 && collectionData[1] && collectionData[2]) {
        noteSheetRef = doc(db, collectionData[1], collectionData[2]);
        // console.log("✅ NoteSheet document reference:", noteSheetRef.path);
        constraints.push(where("note_sheet_allocation", "==", noteSheetRef));
      } else {
        console.warn("⚠️ Invalid note_sheet_allocation format:", note_sheet_allocation);
      }
    }
    if (docrefinvoice && docrefinvoice !== "All") {
      let collectionData: string[] = [];
      let invoiceRef: any = null;

      if (typeof docrefinvoice === "string") collectionData = docrefinvoice.split("/");

      if (collectionData.length > 2 && collectionData[1] && collectionData[2]) {
        invoiceRef = doc(db, collectionData[1], collectionData[2]);
        console.log("✅ Invoice document reference:", invoiceRef.path);
        constraints.push(where("docrefinvoice", "==", invoiceRef));
      } else {
        console.warn("⚠️ Invalid docrefinvoice format:", docrefinvoice);
      }
    }

    if (islogin && islogin !== "All") {
      constraints.push(where("islogin", "==", String(islogin) === "true"));
    }

    if (email && email !== "All") {
      constraints.push(where("email", "==", String(email)));
    }

    if (rodocref && rodocref !== "All") {
      const rodocrefRef = doc(db, "Advertisement", String(rodocref));
      constraints.push(where("rodocref", "==", rodocrefRef));
    }

    if (user_role && user_role !== "All") {
      constraints.push(where("user_role", "==", String(user_role)));
    }

    if (action && action !== "All") {
      constraints.push(where("action", "==", Number(action)));
    }

    if (status && status !== "All") {
      constraints.push(where("status", "==", String(status)));
    }

    if (platform && platform !== "All") {
      constraints.push(where("platform", "==", String(platform)));
    }

    if (screen && screen !== "All") {
      constraints.push(where("screen", "==", String(screen)));
    }

    if (allocation_type && allocation_type !== "All") {
      constraints.push(where("Newspaper_allocation.allocation_type", "==", String(allocation_type)));
    }

    if (actionDate && actionDate !== "All") {
      const startDate = new Date(`${actionDate}T00:00:00Z`);
      const endDate = new Date(`${actionDate}T23:59:59.999Z`);

      constraints.push(where("actiontime", ">=", Timestamp.fromDate(startDate)));
      constraints.push(where("actiontime", "<=", Timestamp.fromDate(endDate)));
    }

    constraints.push(orderBy("actiontime", "desc"));

    const allSnap = await getDocs(query(actionLogsRef, ...constraints));
    const allDocs = allSnap.docs;

    const totalDocs = allDocs.length;
    const totalPages = Math.ceil(totalDocs / Number(limit));

    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);

    const pageDocs = allDocs.slice(startIndex, endIndex);

    const logs = pageDocs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    res.status(200).json({
      success: true,
      message: "ActionLogs fetched successfully",
      pagination: {
        currentPage: Number(page),
        totalPages,
        hasNextPage: Number(page) < totalPages,
        hasPreviousPage: Number(page) > 1,
        nextPage: Number(page) < totalPages ? Number(page) + 1 : null,
        prevPage: Number(page) > 1 ? Number(page) - 1 : null,
      },
      count: logs.length,
      data: logs,
    });
  } catch (error: Error | any) {
    console.error("Error in getAllActionLogs:", error);
    handleError(res, error);
  }
};

export const getActionLogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new AppError("ID parameter is required", 400);
    }
    const logRef = doc(db, "actionLogs", id);
    const snapshot = await getDoc(logRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, message: "ActionLog not found" });
    }

    res.status(200).json({ success: true, id: snapshot.id, data: snapshot.data() });
  } catch (error: Error | any) {
    console.error("Error in getActionLogById:", error);
    handleError(res, error);
  }
};

export const deleteActionLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new AppError("ID parameter is required", 400);
    }
    const logRef = doc(db, "actionLogs", id);
    await deleteDoc(logRef);
    res.status(200).json({ success: true, message: "ActionLog deleted successfully" });
  } catch (error: Error | any) {
    console.error("Error in deleteActionLog:", error);
    handleError(res, error);
  }
};
