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
  count,
  where,
  query
} from "firebase/firestore";

const actionLogsRef = collection(db, "actionLogs");
import { AppError, handleError } from "../utils/errorHandler.js";

// ✅ Create ActionLog
export const createActionLog = async (req, res) => {
  try {
    console.log(req.body);
    if (
      req.body.platform &&
      !["iOS", "Android", "Web"].includes(req.body.platform)
    ) {
      throw new AppError("Invalid platform type", 422, {
        allowed: ["iOS", "Android", "Web"],
      });
    }
    if (
      req.body.Newspaper_allocation?.allocation_type &&
      !["Manual", "Automatic"].includes(
        req.body.Newspaper_allocation.allocation_type
      )
    ) {
      throw new AppError("Invalid allocation type", 422, {
        allowed: ["Manual", "Automatic"],
      });
    }
    let log = new ActionLog(req.body);
    log.networkip = req.body.networkip || req.clientIp;
    const docRef = await addDoc(actionLogsRef, { ...log });
    res.status(201).json({ success: true, message: "ActionLog created", id: docRef.id });
  } catch (error) {
    res.status(500).json({ success: false, message: "error in creating action log", error: error.message });
  }
};

// ✅ Get All ActionLogs
export const getAllActionLogs = async (req, res) => {
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
      fromDate,
      toDate
    } = req.query;
    let constraints = [];

    if (user_ref!=='all') constraints.push(where("user_ref", "==", user_ref));
    if (islogin !== 'all') constraints.push(where("islogin", "==", islogin === "true"));
    if (rodocref!=='all') constraints.push(where("rodocref", "==", rodocref));
    if (user_role!=='all') constraints.push(where("user_role", "==", user_role));
    if (action!=='all') constraints.push(where("action", "==", action));
    if (status!=='all') constraints.push(where("status", "==", status)); // e.g., success/failed
    if (platform!=='all') constraints.push(where("platform", "==", platform));
    if (screen!=='all') constraints.push(where("screen", "==", screen));
    if (allocation_type!=='all')
      constraints.push(where("newspaper_allocation.allocation_type", "==", allocation_type));
    if (fromDate!=='all')  {
      constraints.push(
        where("actiontime", ">=", new Date(fromDate)),
      );
    }
    if (toDate!=='all'){
      constraints.push(
        where("actiontime", "<=", new Date(toDate))
      );
    }
    // Build query
    const q = constraints.length > 0 ? query(actionLogsRef, ...constraints) : actionLogsRef;

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(404).json({ success: true, message: "No logs found", count: 0, data: [] });
    }

    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ success: true, message: "ActionLogs fetched successfully", count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get ActionLog by Doc ID
export const getActionLogById = async (req, res) => {
  try {
    const logRef = doc(db, "actionLogs", req.params.id);
    const snapshot = await getDoc(logRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ message: "ActionLog not found" });
    }

    res.status(200).json({ id: snapshot.id, ...snapshot.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Delete ActionLog by ID
export const deleteActionLog = async (req, res) => {
  try {
    const logRef = doc(db, "actionLogs", req.params.id);
    await deleteDoc(logRef);
    res.status(200).json({ message: "ActionLog deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
