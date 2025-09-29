class ActionLog {
  constructor({
    // id = null,
    user_ref = null,
    islogin = false,
    rodocref = null,
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
  }) {
    // this.id = id; // Firestore doc ID (optional) 
    this.user_ref = user_ref;
    this.islogin = islogin;
    this.rodocref = rodocref;
    this.docrefinvoice = docrefinvoice;
    this.email = email;
    this.old_data = old_data;
    this.edited_data = edited_data;
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
            Newspaper_allocation?.allocation_type
          )
          ? Newspaper_allocation?.allocation_type
          : null,

      allotedby: Newspaper_allocation?.allotedby || null,
    };
  }
}

const AllocationType = Object.freeze({
  MANUAL: "Manual",
  AUTOMATIC: "Automatic",
});

// Enum for platform
const PlatformType = Object.freeze({
  IOS: "iOS", 
  ANDROID: "Android",
  WEB: "Web",
}); 

export default ActionLog;
