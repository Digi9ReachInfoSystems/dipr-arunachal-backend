export class AppError extends Error {
    statusCode;
    details;
    constructor(message, statusCode = 400, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
export const handleError = (res, error) => {
    console.error("🔥 Error:", error);
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            details: error.details ?? null,
        });
    }
    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
};
//# sourceMappingURL=errorHandler.js.map