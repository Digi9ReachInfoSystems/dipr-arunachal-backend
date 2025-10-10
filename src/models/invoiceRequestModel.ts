import { DocumentReference, Timestamp } from "firebase/firestore";

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

  constructor({
    InvoiceId = "",
    Assitanttatus = 0,
    DateOfInvoice = null,
    DeptName = "",
    InvoiceUrl = "",
    Newspaperclip = "",
    Ronumber = "",
    TypeOfDepartment = "",
    Userref = null,
    advertiseRef = null,
    billingAddress = "",
    billno = "",
    clerkDivision = 0,
    deputyDirector_status = 0,
    deputydirecotor = "",
    invoiceamount = 0,
    isSendForward = false,
    jobref = null,
    newspaperpageNo = "",
    phoneNumber = "",
    sendAgain = false,
    vendorName = "",
  }: InvoiceProps) {
    this.InvoiceId = InvoiceId;
    this.Assitanttatus = Assitanttatus;
    this.DateOfInvoice = DateOfInvoice;
    this.DeptName = DeptName;
    this.InvoiceUrl = InvoiceUrl;
    this.Newspaperclip = Newspaperclip;
    this.Ronumber = Ronumber;
    this.TypeOfDepartment = TypeOfDepartment;
    this.Userref = Userref;
    this.advertiseRef = advertiseRef;
    this.billingAddress = billingAddress;
    this.billno = billno;
    this.clerkDivision = clerkDivision;
    this.deputyDirector_status = deputyDirector_status;
    this.deputydirecotor = deputydirecotor;
    this.invoiceamount = invoiceamount;
    this.isSendForward = isSendForward;
    this.jobref = jobref;
    this.newspaperpageNo = newspaperpageNo;
    this.phoneNumber = phoneNumber;
    this.sendAgain = sendAgain;
    this.vendorName = vendorName;
  }
}
