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
  and,
} from "firebase/firestore";
import { AppError, handleError } from "../utils/errorHandler.js";

const actionLogsRef = collection(db, "actionLogs");

// ✅ Create ActionLog
export const createActionLog = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    console.log("body", body);
    const xForwardedFor = req.headers["x-forwarded-for"];
    const clientIp = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0] : undefined;
    // console.log("headers", clientIp, "ip", req.ip);
    const normalize = (val: any) =>
      val === "null" || val === "undefined" || val === undefined || val === null || val === 0 ? null : val;

    // Normalize top-level string fields
    for (const key of Object.keys(body)) {
      body[key] = normalize(body[key]);
    }
    console.log("after normalize", body);

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
    if (body.adRef) {
      const collectionData = body.adRef.split("/");
      body.adRef =
        collectionData.length > 2 ? doc(db, collectionData[1], collectionData[2]) : null;
    }
    if (body.note_sheet_allocation) {
      const collectionData = body.note_sheet_allocation.split("/");
      body.note_sheet_allocation =
        collectionData.length > 2 ? doc(db, collectionData[1], collectionData[2]) : null;
    }

    const log = new ActionLog(body);
    log.networkip =clientIp || null;

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
      adRef,
    } = req.query;
    console.log("req.query", req.query);
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
        console.warn(" Invalid user_ref format:", user_ref);
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
        console.warn(" Invalid note_sheet_allocation format:", note_sheet_allocation);
      }
    }
    if (docrefinvoice && docrefinvoice !== "All") {
      let collectionData: string[] = [];
      let invoiceRef: any = null;

      if (typeof docrefinvoice === "string") collectionData = docrefinvoice.split("/");

      if (collectionData.length > 2 && collectionData[1] && collectionData[2]) {
        invoiceRef = doc(db, collectionData[1], collectionData[2]);
        // console.log("✅ Invoice document reference:", invoiceRef.path);
        constraints.push(where("docrefinvoice", "==", invoiceRef));
      } else {
        console.warn(" Invalid docrefinvoice format:", docrefinvoice);
      }
    }
    if (adRef && adRef !== "All") {
      let collectionData: string[] = [];
      let adRefDoc: any = null;

      if (typeof adRef === "string") collectionData = adRef.split("/");

      if (collectionData.length > 2 && collectionData[1] && collectionData[2]) {
        adRefDoc = doc(db, collectionData[1], collectionData[2]);
        // console.log("✅ Ad document reference:", adRefDoc.path);
        constraints.push(where("adRef", "==", adRefDoc));
      } else {
        console.warn(" Invalid adRef format:", adRef);
      }
    }

    if (islogin && islogin !== "All") {
      constraints.push(where("islogin", "==", String(islogin) === "true"));
    }

    if (email && email !== "All") {
      constraints.push(where("email", "==", String(email)));
    }

    if (rodocref && rodocref !== "All") {
      let collectionData: string[] = [];
      let rodocrefRef: any = null;
      if (typeof rodocref === "string") collectionData = rodocref.split("/");
      if (collectionData.length > 2 && collectionData[1] && collectionData[2]) {
        rodocrefRef = doc(db, collectionData[1], collectionData[2]);
        // console.log("✅ RO document reference:", rodocrefRef.path);
        constraints.push(where("rodocref", "==", rodocrefRef));
      } else {
        console.warn(" Invalid rodocref format:", rodocref);
      }
    }

    if (user_role && user_role !== "All") {
      constraints.push(where("user_role", "==", String(user_role)));
    }
    console.log("action", action);
    if (action && action !== "0"&& Number(action)!==0) {
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


export const getSuccessFailureActionlogCounts = async (req: Request, res: Response) => {
  try {
    const successQuery = query(actionLogsRef, where("status", "==", "Success"));
    const failureQuery = query(actionLogsRef, where("status", "==", "Failed"));
    const loginLogsQuery = query(actionLogsRef, where("islogin", "==", true));
    const loginSuccessQuery = query(actionLogsRef, where("islogin", "==", true), where("status", "==", "Success"));
    const loginFailureQuery = query(actionLogsRef, where("islogin", "==", true), where("status", "==", "Failed"));

    const actionLogsQuery = query(actionLogsRef, where("islogin", "==", false));
    const actionlogsSuccessQuery = query(actionLogsRef, where("islogin", "==", false), where("status", "==", "Success"));
    const actionlogsFailureQuery = query(actionLogsRef, where("islogin", "==", false), where("status", "==", "Failed"));

    const allSnap = await getDocs(actionLogsRef);
    const allDocs = allSnap.docs;
    const loginSnap = await getDocs(loginLogsQuery);
    const successSnapshot = await getDocs(successQuery);
    const failureSnapshot = await getDocs(failureQuery);
    const loginSuccessSnapshot = await getDocs(loginSuccessQuery);
    const loginFailureSnapshot = await getDocs(loginFailureQuery);
    const actionlogsSnap = await getDocs(actionLogsQuery);
    const actionlogsSuccessSnapshot = await getDocs(actionlogsSuccessQuery);
    const actionlogsFailureSnapshot = await getDocs(actionlogsFailureQuery);

    const successCount = successSnapshot.size;
    const failureCount = failureSnapshot.size;
    const loginCount = loginSnap.size;
    const loginSuccessCount = loginSuccessSnapshot.size;
    const loginFailureCount = loginFailureSnapshot.size;
    const totalCount = allDocs.length;

    res.status(200).json({
      success: true,
      totalLogs: totalCount,
      successCount,
      failureCount,
      loginLog: {
        totalCount: loginCount,
        successCount: loginSuccessCount,
        failureCount: loginFailureCount
      },
      actionLog: {
        totalCount: actionlogsSnap.size,
        successCount: actionlogsSuccessSnapshot.size,
        failureCount: actionlogsFailureSnapshot.size
      }
    });
  } catch (error: Error | any) {
    console.error("Error in getSuccessFailureActionlogCounts:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getSuccessFailureActionlogCountsByYear = async (req: Request, res: Response) => {
  const { year } = req.params;

  if (!year) {
    return res.status(400).json({ success: false, message: "Year parameter is required" });
  }

  try {
    const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

    // === Yearly queries ===
    const baseWhere = [
      where("actiontime", ">=", startOfYear),
      where("actiontime", "<=", endOfYear),
    ];

    const [
      allSnap,
      successSnap,
      failureSnap,
      loginSnap,
      loginSuccessSnap,
      loginFailureSnap,
      actionSnap,
      actionSuccessSnap,
      actionFailureSnap,
    ] = await Promise.all([
      getDocs(actionLogsRef),
      getDocs(query(actionLogsRef, where("status", "==", "Success"), ...baseWhere)),
      getDocs(query(actionLogsRef, where("status", "==", "Failed"), ...baseWhere)),
      getDocs(query(actionLogsRef, where("islogin", "==", true), ...baseWhere)),
      getDocs(query(actionLogsRef, where("islogin", "==", true), where("status", "==", "Success"), ...baseWhere)),
      getDocs(query(actionLogsRef, where("islogin", "==", true), where("status", "==", "Failed"), ...baseWhere)),
      getDocs(query(actionLogsRef, where("islogin", "==", false), ...baseWhere)),
      getDocs(query(actionLogsRef, where("islogin", "==", false), where("status", "==", "Success"), ...baseWhere)),
      getDocs(query(actionLogsRef, where("islogin", "==", false), where("status", "==", "Failed"), ...baseWhere)),
    ]);

    const yearlySummary = {
      totalLogs: allSnap.size,
      successCount: successSnap.size,
      failureCount: failureSnap.size,
      loginLog: {
        totalCount: loginSnap.size,
        successCount: loginSuccessSnap.size,
        failureCount: loginFailureSnap.size,
      },
      actionLog: {
        totalCount: actionSnap.size,
        successCount: actionSuccessSnap.size,
        failureCount: actionFailureSnap.size,
      },
    };

    // === Monthly breakdown ===
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    const monthlyPromises = monthNames.map((month, i) => {
      const start = new Date(Date.UTC(Number(year), i, 1, 0, 0, 0));
      const end = new Date(Date.UTC(Number(year), i + 1, 0, 23, 59, 59));

      const commonWhere = [where("actiontime", ">=", start), where("actiontime", "<=", end)];

      return Promise.all([
        getDocs(query(actionLogsRef, ...commonWhere)), // total
        getDocs(query(actionLogsRef, where("status", "==", "Success"), ...commonWhere)),
        getDocs(query(actionLogsRef, where("status", "==", "Failed"), ...commonWhere)),
        getDocs(query(actionLogsRef, where("islogin", "==", true), ...commonWhere)), // login total
        getDocs(query(actionLogsRef, where("islogin", "==", true), where("status", "==", "Success"), ...commonWhere)),
        getDocs(query(actionLogsRef, where("islogin", "==", true), where("status", "==", "Failed"), ...commonWhere)),
        getDocs(query(actionLogsRef, where("islogin", "==", false), ...commonWhere)), // action total
        getDocs(query(actionLogsRef, where("islogin", "==", false), where("status", "==", "Success"), ...commonWhere)),
        getDocs(query(actionLogsRef, where("islogin", "==", false), where("status", "==", "Failed"), ...commonWhere)),
      ]).then(
        ([
          total,
          success,
          failed,
          loginTotal,
          loginSuccess,
          loginFailed,
          actionTotal,
          actionSuccess,
          actionFailed,
        ]) => ({
          month,
          total: total.size,
          successCount: success.size,
          failureCount: failed.size,
          loginLog: {
            totalCount: loginTotal.size,
            successCount: loginSuccess.size,
            failureCount: loginFailed.size,
          },
          actionLog: {
            totalCount: actionTotal.size,
            successCount: actionSuccess.size,
            failureCount: actionFailed.size,
          },
        })
      );
    });

    const monthlyData = await Promise.all(monthlyPromises);

    // === Response ===
    return res.status(200).json({
      success: true,
      year,
      ...yearlySummary,
      monthlyData,
    });
  } catch (error: any) {
    console.error("❌ Error in getSuccessFailureActionlogCountsByYear:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};



export const getSuccessFailureActionlogCountsByPlatformAndYear = async (
  req: Request,
  res: Response
) => {
  const { year } = req.params;

  if (!year) {
    return res.status(400).json({
      success: false,
      message: "Year parameter is required",
    });
  }

  try {
    const platforms = ["iOS", "Android", "Web"];
    const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    // 🔹 Loop through all 3 platforms
    const results = await Promise.all(
      platforms.map(async (platform) => {
        // === Yearly summary ===
        const baseFilters = [
          where("platform", "==", platform),
          where("actiontime", ">=", startOfYear),
          where("actiontime", "<=", endOfYear),
        ];

        const [
          allSnap,
          successSnap,
          failureSnap,
          loginSnap,
          loginSuccessSnap,
          loginFailureSnap,
          actionSnap,
          actionSuccessSnap,
          actionFailureSnap,
        ] = await Promise.all([
          getDocs(query(actionLogsRef, ...baseFilters)),
          getDocs(query(actionLogsRef, where("status", "==", "Success"), ...baseFilters)),
          getDocs(query(actionLogsRef, where("status", "==", "Failed"), ...baseFilters)),
          getDocs(query(actionLogsRef, where("islogin", "==", true), ...baseFilters)),
          getDocs(query(actionLogsRef, where("islogin", "==", true), where("status", "==", "Success"), ...baseFilters)),
          getDocs(query(actionLogsRef, where("islogin", "==", true), where("status", "==", "Failed"), ...baseFilters)),
          getDocs(query(actionLogsRef, where("islogin", "==", false), ...baseFilters)),
          getDocs(query(actionLogsRef, where("islogin", "==", false), where("status", "==", "Success"), ...baseFilters)),
          getDocs(query(actionLogsRef, where("islogin", "==", false), where("status", "==", "Failed"), ...baseFilters)),
        ]);

        const yearlySummary = {
          platform,
          totalLogs: allSnap.size,
          successCount: successSnap.size,
          failureCount: failureSnap.size,
          loginLog: {
            totalCount: loginSnap.size,
            successCount: loginSuccessSnap.size,
            failureCount: loginFailureSnap.size,
          },
          actionLog: {
            totalCount: actionSnap.size,
            successCount: actionSuccessSnap.size,
            failureCount: actionFailureSnap.size,
          },
        };

        // === Monthly summary ===
        const monthlyPromises = monthNames.map(async (month, i) => {
          const start = new Date(Date.UTC(Number(year), i, 1, 0, 0, 0));
          const end = new Date(Date.UTC(Number(year), i + 1, 0, 23, 59, 59));
          const monthFilter = [
            where("platform", "==", platform),
            where("actiontime", ">=", start),
            where("actiontime", "<=", end),
          ];

          const [
            totalSnap,
            successSnap,
            failSnap,
            loginTotalSnap,
            loginSuccessSnap,
            loginFailSnap,
            actionTotalSnap,
            actionSuccessSnap,
            actionFailSnap,
          ] = await Promise.all([
            getDocs(query(actionLogsRef, ...monthFilter)),
            getDocs(query(actionLogsRef, where("status", "==", "Success"), ...monthFilter)),
            getDocs(query(actionLogsRef, where("status", "==", "Failed"), ...monthFilter)),
            getDocs(query(actionLogsRef, where("islogin", "==", true), ...monthFilter)),
            getDocs(query(actionLogsRef, where("islogin", "==", true), where("status", "==", "Success"), ...monthFilter)),
            getDocs(query(actionLogsRef, where("islogin", "==", true), where("status", "==", "Failed"), ...monthFilter)),
            getDocs(query(actionLogsRef, where("islogin", "==", false), ...monthFilter)),
            getDocs(query(actionLogsRef, where("islogin", "==", false), where("status", "==", "Success"), ...monthFilter)),
            getDocs(query(actionLogsRef, where("islogin", "==", false), where("status", "==", "Failed"), ...monthFilter)),
          ]);

          return {
            month,
            totalCount: totalSnap.size,
            successCount: successSnap.size,
            failureCount: failSnap.size,
            loginLog: {
              totalCount: loginTotalSnap.size,
              successCount: loginSuccessSnap.size,
              failureCount: loginFailSnap.size,
            },
            actionLog: {
              totalCount: actionTotalSnap.size,
              successCount: actionSuccessSnap.size,
              failureCount: actionFailSnap.size,
            },
          };
        });

        const monthlyData = await Promise.all(monthlyPromises);
        return { platform, yearlySummary, monthlyData };
      })
    );

    // ✅ Final Response
    return res.status(200).json({
      success: true,
      year,
      data: results,
    });
  } catch (error: any) {
    console.error("❌ Error in getSuccessFailureActionlogCountsByPlatformAndYear:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


export const getSuccessFailureActionlogCountsByAllocationTypeAndYear = async (
  req: Request,
  res: Response
) => {
  const { year } = req.params;

  if (!year) {
    return res.status(400).json({
      success: false,
      message: "Year parameter is required",
    });
  }

  try {
    const allocationTypes = ["Manual", "Automatic"];
    const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    // 🔹 Loop through both allocation types
    const results = await Promise.all(
      allocationTypes.map(async (allocation_type) => {
        // === Yearly summary ===
        const baseFilters = [
          where("Newspaper_allocation.allocation_type", "==", allocation_type),
          where("actiontime", ">=", startOfYear),
          where("actiontime", "<=", endOfYear),
        ];

        const [
          allSnap,
          successSnap,
          failureSnap,
        ] = await Promise.all([
          getDocs(query(actionLogsRef, ...baseFilters)),
          getDocs(query(actionLogsRef, where("status", "==", "Success"), ...baseFilters)),
          getDocs(query(actionLogsRef, where("status", "==", "Failed"), ...baseFilters)),
        ]);

        const yearlySummary = {
          allocation_type,
          totalLogs: allSnap.size,
          successCount: successSnap.size,
          failureCount: failureSnap.size,
        };

        // === Monthly summary ===
        const monthlyPromises = monthNames.map(async (month, i) => {
          const start = new Date(Date.UTC(Number(year), i, 1, 0, 0, 0));
          const end = new Date(Date.UTC(Number(year), i + 1, 0, 23, 59, 59));
          const monthFilter = [
            where("Newspaper_allocation.allocation_type", "==", allocation_type),
            where("actiontime", ">=", start),
            where("actiontime", "<=", end),
          ];

          const [totalSnap, successSnap, failSnap] = await Promise.all([
            getDocs(query(actionLogsRef, ...monthFilter)),
            getDocs(query(actionLogsRef, where("status", "==", "Success"), ...monthFilter)),
            getDocs(query(actionLogsRef, where("status", "==", "Failed"), ...monthFilter)),
          ]);

          return {
            month,
            totalCount: totalSnap.size,
            successCount: successSnap.size,
            failureCount: failSnap.size,
          };
        });

        const monthlyData = await Promise.all(monthlyPromises);
        return { allocation_type, yearlySummary, monthlyData };
      })
    );

    // ✅ Final Response
    return res.status(200).json({
      success: true,
      year,
      data: results,
    });
  } catch (error: any) {
    console.error("❌ Error in getSuccessFailureActionlogCountsByAllocationTypeAndYear:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};



