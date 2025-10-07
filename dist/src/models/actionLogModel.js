import { DocumentReference } from "firebase/firestore";
export var AllocationType;
(function (AllocationType) {
    AllocationType["MANUAL"] = "Manual";
    AllocationType["AUTOMATIC"] = "Automatic";
})(AllocationType || (AllocationType = {}));
export var PlatformType;
(function (PlatformType) {
    PlatformType["IOS"] = "iOS";
    PlatformType["ANDROID"] = "Android";
    PlatformType["WEB"] = "Web";
})(PlatformType || (PlatformType = {}));
export default class ActionLog {
    user_ref;
    islogin;
    rodocref;
    ronumber;
    docrefinvoice;
    email;
    old_data;
    edited_data;
    user_role;
    action;
    message;
    status;
    actiontime;
    platform;
    networkip;
    screen;
    Newspaper_allocation;
    adRef;
    note_sheet_allocation;
    constructor({ user_ref = null, islogin = false, rodocref = null, ronumber = null, docrefinvoice = null, email = "", old_data = {}, edited_data = {}, user_role = "", action = null, message = "", status = "", actiontime = new Date(), platform = null, networkip = null, screen = "", Newspaper_allocation = {
        Newspaper: [],
        allotedtime: null,
        allocation_type: null,
        allotedby: null,
    }, adRef = null, note_sheet_allocation = null, }) {
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
            allocation_type: Newspaper_allocation?.allocation_type === null ||
                Object.values(AllocationType).includes(Newspaper_allocation?.allocation_type)
                ? Newspaper_allocation?.allocation_type || null
                : null,
            allotedby: Newspaper_allocation?.allotedby || null,
        };
        this.adRef = adRef;
        this.note_sheet_allocation = note_sheet_allocation;
    }
}
//# sourceMappingURL=actionLogModel.js.map