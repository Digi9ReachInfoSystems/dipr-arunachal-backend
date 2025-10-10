import { DocumentReference } from "firebase/firestore";
export interface InvoiceProps {
    InvoiceId?: string;
    Assitanttatus?: number;
    DateOfInvoice?: Date | null;
    DeptName?: string;
    InvoiceUrl?: string;
    Newspaperclip?: string;
    Ronumber?: string;
    TypeOfDepartment?: string;
    Userref?: DocumentReference | null;
    advertiseRef?: DocumentReference | null;
    billingAddress?: string;
    billno?: string;
    clerkDivision?: number;
    deputyDirector_status?: number;
    deputydirecotor?: string;
    invoiceamount?: number;
    isSendForward?: boolean;
    jobref?: DocumentReference | null;
    newspaperpageNo?: string;
    phoneNumber?: string;
    sendAgain?: boolean;
    vendorName?: string;
}
export default class Invoice {
    InvoiceId: string;
    Assitanttatus: number;
    DateOfInvoice: Date | null;
    DeptName: string;
    InvoiceUrl: string;
    Newspaperclip: string;
    Ronumber: string;
    TypeOfDepartment: string;
    Userref: DocumentReference | null;
    advertiseRef: DocumentReference | null;
    billingAddress: string;
    billno: string;
    clerkDivision: number;
    deputyDirector_status: number;
    deputydirecotor: string;
    invoiceamount: number;
    isSendForward: boolean;
    jobref: DocumentReference | null;
    newspaperpageNo: string;
    phoneNumber: string;
    sendAgain: boolean;
    vendorName: string;
    constructor({ InvoiceId, Assitanttatus, DateOfInvoice, DeptName, InvoiceUrl, Newspaperclip, Ronumber, TypeOfDepartment, Userref, advertiseRef, billingAddress, billno, clerkDivision, deputyDirector_status, deputydirecotor, invoiceamount, isSendForward, jobref, newspaperpageNo, phoneNumber, sendAgain, vendorName, }: InvoiceProps);
}
//# sourceMappingURL=invoiceRequestModel.d.ts.map