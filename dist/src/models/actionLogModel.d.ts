import { DocumentReference } from "firebase/firestore";
export declare enum AllocationType {
    MANUAL = "Manual",
    AUTOMATIC = "Automatic"
}
export declare enum PlatformType {
    IOS = "iOS",
    ANDROID = "Android",
    WEB = "Web"
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
    constructor({ user_ref, islogin, rodocref, ronumber, docrefinvoice, email, old_data, edited_data, user_role, action, message, status, actiontime, platform, networkip, screen, Newspaper_allocation, newspaper_job_allocation, note_sheet_allocation, }: ActionLogProps);
}
//# sourceMappingURL=actionLogModel.d.ts.map