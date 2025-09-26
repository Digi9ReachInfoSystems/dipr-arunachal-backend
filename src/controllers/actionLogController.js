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
  query,
  orderBy,
  limit as limitFn,
  startAfter,
  documentId
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
    console.log(error);
    res.status(500).json({ success: false, message: "error in creating action log", error: error.message });
  }
};



// ✅ Get All ActionLogs
// export const getAllActionLogs = async (req, res) => {
//   try {
//     const {
//       user_ref,
//       islogin,
//       rodocref,
//       user_role,
//       action,
//       status,
//       platform,
//       screen,
//       allocation_type,
//       fromDate,
//       toDate,
//       limit = 10,
//       cursor = null,
//       direction = "next",
//     } = req.query;
//     let constraints = [];

//     if (user_ref !== 'all') constraints.push(where("user_ref", "==", user_ref));
//     if (islogin !== 'all') constraints.push(where("islogin", "==", islogin === "true"));
//     if (rodocref !== 'all') constraints.push(where("rodocref", "==", rodocref));
//     if (user_role !== 'all') constraints.push(where("user_role", "==", user_role));
//     if (action !== 'all') constraints.push(where("action", "==", action));
//     if (status !== 'all') constraints.push(where("status", "==", status)); // e.g., success/failed
//     if (platform !== 'all') constraints.push(where("platform", "==", platform));
//     if (screen !== 'all') constraints.push(where("screen", "==", screen));
//     if (allocation_type !== 'all')
//       constraints.push(where("newspaper_allocation.allocation_type", "==", allocation_type));
//     if (fromDate !== 'all') {
//       constraints.push(
//         where("actiontime", ">=", new Date(fromDate)),
//       );
//     }
//     if (toDate !== 'all') {
//       constraints.push(
//         where("actiontime", "<=", new Date(toDate))
//       );
//     }
//     constraints.push(orderBy("actiontime", "desc"));
//     // Apply cursor if provided
//     if (cursor) {
//       constraints.push(startAfter(new Date(cursor)));
//     }
//     // Apply limit (+1 to check next page existence)
//     constraints.push(limitFn(Number(limit) + 1));
//     const countQuery = query(
//       actionLogsRef,
//       ...constraints,
//       where("actiontime", ">", firstVisibleDoc.actiontime) // count all before cursor
//     );
//     const countSnapshot = await getDocs(countQuery);
//     const currentPage = Math.floor(countSnapshot.size / Number(limit)) + 1;

//     // Build query
//     let q;

//     // Cursor logic
//     if (cursor) {
//       const cursorDoc = await getDoc(doc(db, "actionLogs", cursor));
//       if (!cursorDoc.exists()) {
//         return res
//           .status(400)
//           .json({ success: false, message: "Invalid cursor" });
//       }

//       if (direction === "next") {
//         q = query(
//           actionLogsRef,
//           ...constraints,
//           startAfter(cursorDoc),
//           limitFn(Number(limit) + 1)
//         );
//       } else {
//         q = query(
//           actionLogsRef,
//           ...constraints,
//           endBefore(cursorDoc),
//           limitToLast(Number(limit) + 1)
//         );
//       }
//     } else {
//       q = query(actionLogsRef, ...constraints, limitFn(Number(limit) + 1));
//     }

//     // Fetch results
//     const snapshot = await getDocs(q);

//     if (snapshot.empty) {
//       return res.status(200).json({
//         success: true,
//         message: "No logs found",
//         hasNextItem: false,
//         hasPreviousItem: false,
//         nextCursor: null,
//         previousCursor: null,
//         currentPage: currentPage,
//         data: [],
//       });
//     }

//     const docs = snapshot.docs;
//     const hasNextItem = docs.length > Number(limit);

//     // Slice to remove the extra doc used for next-page check
//     const pageDocs = docs.slice(0, Number(limit));

//     const logs = pageDocs.map((d) => ({
//       id: d.id,
//       ...d.data(),
//     }));

//     // Cursors
//     const nextCursor = hasNextItem ? pageDocs[pageDocs.length - 1].id : null;
//     const previousCursor = pageDocs.length > 0 ? pageDocs[0].id : null;

//     // Page tracking: client increments/decrements pageNumber
//     const hasPreviousItem = pageNumber > 1;

//     res.status(200).json({
//       success: true,
//       message: "ActionLogs fetched successfully",
//       pagination: {
//         currentPage:currentPage,
//         hasNextItem,
//         hasPreviousItem,
//         nextCursor,
//         previousCursor,
//       },
//       count: logs.length,
//       data: logs,
//     });
//     // if (snapshot.empty) {
//     //   return res.status(404).json({ success: true, message: "No logs found", count: 0, data: [] });
//     // }

//     // const logs = snapshot.docs.map((doc) => ({
//     //   id: doc.id,
//     //   ...doc.data(),
//     // }));

//     // res.status(200).json({ success: true, message: "ActionLogs fetched successfully", count: logs.length, data: logs });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };
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
      toDate,
      page = 0,  
      limit = 10
    } = req.query;

    let constraints = [];

    if (user_ref !== "all") constraints.push(where("user_ref", "==", user_ref));
    if (islogin !== "all") constraints.push(where("islogin", "==", islogin === "true"));
    if (rodocref !== "all") constraints.push(where("rodocref", "==", rodocref));
    if (user_role !== "all") constraints.push(where("user_role", "==", user_role));
    if (action !== "all") constraints.push(where("action", "==", Number(action)));
    if (status !== "all") constraints.push(where("status", "==", status));
    if (platform !== "all") constraints.push(where("platform", "==", platform));
    if (screen !== "all") constraints.push(where("screen", "==", screen));
    if (allocation_type !== "all")
      constraints.push(where("newspaper_allocation.allocation_type", "==", allocation_type));
    if (fromDate !== "all") constraints.push(where("actiontime", ">=", new Date(fromDate)));
    if (toDate !== "all") constraints.push(where("actiontime", "<=", new Date(toDate)));

    constraints.push(orderBy("actiontime", "desc"));

    // 🔹 Fetch all docs (be careful: can be costly if collection is very large)
    const allSnap = await getDocs(query(actionLogsRef, ...constraints));
    const allDocs = allSnap.docs;

    const totalDocs = allDocs.length;
    const totalPages = Math.ceil(totalDocs / Number(limit));

    const startIndex = Number(page) * Number(limit);
    const endIndex = startIndex + Number(limit);

    const pageDocs = allDocs.slice(startIndex, endIndex);

    const logs = pageDocs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      success: true,
      message: "ActionLogs fetched successfully",
      pagination: {
        currentPage: Number(page),                       // starts at 0
        totalPages,
        hasNextPage: Number(page) < totalPages - 1,
        hasPreviousPage: Number(page) > 0,
        nextPage: Number(page) < totalPages - 1 ? Number(page) + 1 : null,
        prevPage: Number(page) > 0 ? Number(page) - 1 : null,
      },
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.log("Error in getAllActionLogs:", error);
    res.status(500).json({ error: error.message });
  }
};



//   try {
//     const {
//       user_ref,
//       islogin,
//       rodocref,
//       user_role,
//       action,
//       status,
//       platform,
//       screen,
//       allocation_type,
//       fromDate,
//       toDate,
//       page = 0,
//       limit = 10,
//     } = req.query;

//     let constraints = [];

//     if (user_ref !== "all") constraints.push(where("user_ref", "==", user_ref));
//     if (islogin !== "all")
//       constraints.push(where("islogin", "==", islogin === "true"));
//     if (rodocref !== "all") constraints.push(where("rodocref", "==", rodocref));
//     if (user_role !== "all") constraints.push(where("user_role", "==", user_role));
//     if (action !== "all") constraints.push(where("action", "==", action));
//     if (status !== "all") constraints.push(where("status", "==", status));
//     if (platform !== "all") constraints.push(where("platform", "==", platform));
//     if (screen !== "all") constraints.push(where("screen", "==", screen));
//     if (allocation_type !== "all")
//       constraints.push(
//         where("newspaper_allocation.allocation_type", "==", allocation_type)
//       );
//     if (fromDate !== "all")
//       constraints.push(where("actiontime", ">=", new Date(fromDate)));
//     if (toDate !== "all")
//       constraints.push(where("actiontime", "<=", new Date(toDate)));

//     const keysSnap = await getDocs(
//       query(actionLogsRef, ...constraints, orderBy("actiontime", "desc"))
//     );

//     if (keysSnap.empty) {
//       return res.status(200).json({
//         success: true,
//         message: "No logs found",
//         pagination: {
//           currentPage: Number(page),
//           totalPages: 0,
//           hasNextPage: false,
//           hasPreviousPage: false,
//           nextPage: null,
//           prevPage: null,
//         },
//         count: 0,
//         data: [],
//       });
//     }

//     const allKeys = keysSnap.docs.map((d) => ({
//       id: d.id,
//       actiontime: d.data().actiontime,
//     }));

//     const totalDocs = allKeys.length;
//     const totalPages = Math.ceil(totalDocs / Number(limit));

//     const startIndex = Number(page) * Number(limit);
//     const endIndex = startIndex + Number(limit);

//     const pageKeys = allKeys.slice(startIndex, endIndex).map((k) => k.id);

//     // ✅ Step 2: fetch only the docs for current page
//     const pageSnap = await getDocs(
//       query(actionLogsRef, where(documentId(), "in", pageKeys))
//     );

//     const logs = pageSnap.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));

//     res.status(200).json({
//       success: true,
//       message: "ActionLogs fetched successfully",
//       pagination: {
//         currentPage: Number(page),
//         totalPages,
//         hasNextPage: Number(page) < totalPages - 1,
//         hasPreviousPage: Number(page) > 0,
//         nextPage: Number(page) < totalPages - 1 ? Number(page) + 1 : null,
//         prevPage: Number(page) > 0 ? Number(page) - 1 : null,
//       },
//       count: logs.length,
//       data: logs,
//     });
//   } catch (error) {
//     console.error("Error in getAllActionLogs:", error);
//     res.status(500).json({ success: false, message: "Internal server error", error: error.message });
//   }
// };




// ✅ Get ActionLog by Doc ID
export const getActionLogById = async (req, res) => {
  try {
    const logRef = doc(db, "actionLogs", req.params.id);
    const snapshot = await getDoc(logRef);

    if (!snapshot.exists()) {
      return res.status(404).json({success: false, message: "ActionLog not found" });
    }

    res.status(200).json({success: true, id: snapshot.id, data:{...snapshot.data()} });
  } catch (error) {
    console.error("Error in getActionLogById:", error);
    res.status(500).json({success: false, error: error.message });
  }
};

// ✅ Delete ActionLog by ID
export const deleteActionLog = async (req, res) => {
  try {
    const logRef = doc(db, "actionLogs", req.params.id);
    await deleteDoc(logRef);
    res.status(200).json({success: true, message: "ActionLog deleted successfully" });
  } catch (error) {
    console.error("Error in deleteActionLog:", error);
    res.status(500).json({success: false, message: "Internal server error", error: error.message });
  }
};
