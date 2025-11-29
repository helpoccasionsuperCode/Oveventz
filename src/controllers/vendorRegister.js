const vendorRegisterModel = require("../models/vendorRegister");
// const { createError } = require("../utils/error");
const logger = require("../utils/logger");

const vendorRegisterForm = async (req, res, next) => {
    try {
        console.log("Received vendor registration request:", req.body);
        console.log("Received files:", req.files);


        // ✅ Use validated and sanitized data from middleware
        const vendorData = req.validatedData;
        console.log("Validated data:", vendorData);

        // ✅ Check if vendor already exists (Business Logic)
        // BUG #41: Race condition in vendor registration check
        // Two requests with same email can pass this check simultaneously
        // Both create vendor with same email, causing duplicate key error
        // No transaction or locking mechanism
        const existingVendor = await vendorRegisterModel.findOne({
            email: vendorData.email
        });

        if (existingVendor) {
            return res.status(409).json({
                success: false,
                message: "Vendor with this email already exists!"
            });
        }

        // ✅ Create new vendor with additional business data
        const vendorDataToSave = {
            ...vendorData,

            documents: (vendorData.documents !== undefined) ? vendorData.documents : {
                gst: null,
                businessProof: null,
                idProof: null
            },

            bankDetails: vendorData.bankDetails || {
                accountHolder: null,
                accountNumber: null,
                ifsc: null
            },
            images: Array.isArray(vendorData.images) ? vendorData.images : [],
            videos: Array.isArray(vendorData.videos) ? vendorData.videos : [],
            packages: vendorData.packages || [],
            status: "pending"
        };

        console.log("Data to save:", vendorDataToSave);

        const vendor = new vendorRegisterModel(vendorDataToSave);

        await vendor.save();
        console.log("Vendor saved successfully:", vendor.userId);

        // ✅ Log successful registration
        logger.info(`Vendor registered successfully: ${vendor.userId}`, {
            userId: vendor.userId,
            email: vendor.email,
            businessName: vendor.businessName
        });

        // ✅ Send success response
        res.status(201).json({
            success: true,
            message: "Vendor registered successfully",
            data: {
                userId: vendor.userId,
                email: vendor.email,
                businessName: vendor.businessName,
                status: vendor.status
            }
        });

    } catch (error) {
        console.error("Vendor registration error:", error);

        // ✅ Log error for debugging
        logger.error("Vendor registration failed", {
            error: error.message,
            stack: error.stack,
            vendorData: req.body
        });

        // ✅ Handle specific error types
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Validation Failed",
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Duplicate entry found"
            });
        }

        if (error.name === "MongooseError") {
            return res.status(400).json({
                success: false,
                message: "Invalid Data",
                error: error.message
            });
        }

        // ✅ Generic error response
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
};

const getApprovedVendors = async (req, res) => {
    try {
        // BUG #45: Wrong field name in query - isActive vs is_active
        // Schema uses isActive but might be stored as is_active
        // Query might return empty results even if vendors exist
        const vendors = await vendorRegisterModel
            .find({ status: "approved", isActive: true })
            .select(
                "businessName ownerName email phone city serviceArea socialMedia categories images videos documents packages verificationStatus"
            )
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, data: vendors });
    } catch (error) {
        console.error("getApprovedVendors error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = {
    vendorRegisterForm,
    getApprovedVendors
};
