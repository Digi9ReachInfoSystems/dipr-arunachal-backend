import { DocumentReference } from "firebase/firestore";

export interface AdvertisementProps {
  AdvertisementId?: string;
  DateOfApplication?: Date | null;
  Subject?: string;
  AddressTo?: string;
  TypeOfAdvertisement?: string;
  Is_CaseWorker?: boolean;
  Is_Deputy?: boolean;
  Is_fao?: boolean;
  Is_Vendor?: boolean;
  Status_Caseworker?: number;
  Status_Deputy?: number;
  Status_Fao?: number;
  Status_Vendor?: number;
  Bearingno?: string;
  Insertion?: string;
  Department_name?: string;
  type_face_size?: string;
  isDarft?: boolean;
  ListofPdf?: string[];
  isnational?: boolean;
  isbothnationalandlocal?: boolean;
  approvednewspaperslocal?: DocumentReference[];
  RegionalNewspaper?: boolean;
  localnewspapers?: boolean;
  DateOfApproval?: Date | null;
  RODATE?: Date | null;
  Bill_to?: string;
  Edition?: string;
  publicationdateList?: Date[];
}

export default class Advertisement {
  AdvertisementId: string;
  DateOfApplication: Date | null;
  Subject: string;
  AddressTo: string;
  TypeOfAdvertisement: string;
  Is_CaseWorker: boolean;
  Is_Deputy: boolean;
  Is_fao: boolean;
  Is_Vendor: boolean;
  Status_Caseworker: number;
  Status_Deputy: number;
  Status_Fao: number;
  Status_Vendor: number;
  Bearingno: string;
  Insertion: string;
  Department_name: string;
  type_face_size: string;
  isDarft: boolean;
  ListofPdf: string[];
  isnational: boolean;
  isbothnationalandlocal: boolean;
  approvednewspaperslocal: DocumentReference[];
  RegionalNewspaper: boolean;
  localnewspapers: boolean;
  DateOfApproval: Date | null;
  RODATE: Date | null;
  Bill_to: string;
  Edition: string;
  publicationdateList: Date[];

  constructor({
    AdvertisementId = "",
    DateOfApplication = null,
    Subject = "",
    AddressTo = "",
    TypeOfAdvertisement = "",
    Is_CaseWorker = false,
    Is_Deputy = false,
    Is_fao = false,
    Is_Vendor = false,
    Status_Caseworker = 0,
    Status_Deputy = 0,
    Status_Fao = 0,
    Status_Vendor = 0,
    Bearingno = "",
    Insertion = "",
    Department_name = "",
    type_face_size = "",
    isDarft = false,
    ListofPdf = [],
    isnational = false,
    isbothnationalandlocal = false,
    approvednewspaperslocal = [],
    RegionalNewspaper = false,
    localnewspapers = false,
    DateOfApproval = null,
    RODATE = null,
    Bill_to = "",
    Edition = "",
    publicationdateList = [],
  }: AdvertisementProps) {
    this.AdvertisementId = AdvertisementId;
    this.DateOfApplication = DateOfApplication;
    this.Subject = Subject;
    this.AddressTo = AddressTo;
    this.TypeOfAdvertisement = TypeOfAdvertisement;
    this.Is_CaseWorker = Is_CaseWorker;
    this.Is_Deputy = Is_Deputy;
    this.Is_fao = Is_fao;
    this.Is_Vendor = Is_Vendor;
    this.Status_Caseworker = Status_Caseworker;
    this.Status_Deputy = Status_Deputy;
    this.Status_Fao = Status_Fao;
    this.Status_Vendor = Status_Vendor;
    this.Bearingno = Bearingno;
    this.Insertion = Insertion;
    this.Department_name = Department_name;
    this.type_face_size = type_face_size;
    this.isDarft = isDarft;
    this.ListofPdf = ListofPdf;
    this.isnational = isnational;
    this.isbothnationalandlocal = isbothnationalandlocal;
    this.approvednewspaperslocal = approvednewspaperslocal;
    this.RegionalNewspaper = RegionalNewspaper;
    this.localnewspapers = localnewspapers;
    this.DateOfApproval = DateOfApproval;
    this.RODATE = RODATE;
    this.Bill_to = Bill_to;
    this.Edition = Edition;
    this.publicationdateList = publicationdateList;
  }
}
