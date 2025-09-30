import { DocumentReference } from "firebase/firestore";

export enum AllocationType {
  MANUAL = "Manual",
  AUTOMATIC = "Automatic",
}

export enum PlatformType {
  IOS = "iOS",
  ANDROID = "Android",
  WEB = "Web",
}

export interface NewspaperAllocation {
  Newspaper: string[];
  allotedtime: Date | null;
  allocation_type: AllocationType | null;
  allotedby: DocumentReference | null;
}

export interface ActionLogProps {
  user_ref?: DocumentReference | null;
  islogin?: boolean;
  rodocref?: DocumentReference | null;
  ronumber?: string | null;
  docrefinvoice?: DocumentReference | null;
  email?: string;
  old_data?: object;
  edited_data?: object;
  user_role?: string;
  action?: number | null;
  message?: string;
  status?: string;
  actiontime?: Date;
  platform?: PlatformType | null;
  networkip?: string | null;
  screen?: string;
  Newspaper_allocation?: Partial<NewspaperAllocation>;
  newspaper_job_allocation?: DocumentReference | null;
  note_sheet_allocation?: DocumentReference | null;
}

export default class ActionLog {
  user_ref: DocumentReference | null;
  islogin: boolean;
  rodocref: DocumentReference | null;
  ronumber: string | null;
  docrefinvoice: DocumentReference | null;
  email: string;
  old_data: object;
  edited_data: object;
  user_role: string;
  action: number | null;
  message: string;
  status: string;
  actiontime: Date;
  platform: PlatformType | null;
  networkip: string | null;
  screen: string;
  Newspaper_allocation: NewspaperAllocation;
  newspaper_job_allocation: DocumentReference | null;
  note_sheet_allocation: DocumentReference | null;
  constructor({
    user_ref = null,
    islogin = false,
    rodocref = null,
    ronumber = null,
    docrefinvoice = null,
    email = "",
    old_data = {},
    edited_data = {},
    user_role = "",
    action = null,
    message = "",
    status = "",
    actiontime = new Date(),
    platform = null,
    networkip = null,
    screen = "",
    Newspaper_allocation = {
      Newspaper: [],
      allotedtime: null,
      allocation_type: null,
      allotedby: null,
    },
    newspaper_job_allocation = null,
    note_sheet_allocation = null,
  }: ActionLogProps) {
    this.user_ref = user_ref;
    this.islogin = islogin;
    this.rodocref = rodocref;
    this.ronumber = ronumber;
    this.docrefinvoice = docrefinvoice;
    this.email = email;
    this.old_data = old_data || {};
    this.edited_data = edited_data || {};
    this.user_role = user_role;
    this.action = action;
    this.message = message;
    this.status = status;
    this.actiontime = actiontime;

    this.platform =
      platform === null || Object.values(PlatformType).includes(platform)
        ? platform
        : null;

    this.networkip = networkip;
    this.screen = screen;

    this.Newspaper_allocation = {
      Newspaper: Newspaper_allocation?.Newspaper || [],
      allotedtime: Newspaper_allocation?.allotedtime || null,
      allocation_type:
        Newspaper_allocation?.allocation_type === null ||
          Object.values(AllocationType).includes(
            Newspaper_allocation?.allocation_type as AllocationType
          )
          ? (Newspaper_allocation?.allocation_type as AllocationType) || null
          : null,
      allotedby: Newspaper_allocation?.allotedby || null,
    };
    this.newspaper_job_allocation = newspaper_job_allocation;
    this.note_sheet_allocation = note_sheet_allocation;
  }

}
