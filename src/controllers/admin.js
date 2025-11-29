// const mongoose = require("mongoose");
// const User = require("../models/user");
// const Vendor = require("../models/vendorRegister");

// const createVendorUser = async (req, res) => {
//     try {
//         const {
//             email,
//             password,
//             phone_number, 
//             vendor_id,
//             businessName,
//             ownerName,
//             city,
//             serviceArea,
//             categories,
//             othersCategories
//         } = req.body;

//         console.log("Raw request body:", req.body);
//         console.log("Extracted fields:", {
//             email,
//             password: password ? "***" : "missing",
//             phone_number,
//             vendor_id,
//             businessName,
//             ownerName,
//             city,
//             serviceArea,
//             categories,
//             othersCategories
//         });

//         // Normalize inputs
//         const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : email;
//         const normalizedPassword = typeof password === "string" ? password.trim() : password;
//         const normalizedPhoneNumber = typeof phone_number === "string" ? phone_number.trim() : phone_number;
//         const normalizedBusinessName = typeof businessName === "string" ? businessName.trim() : businessName;
//         const normalizedOwnerName = typeof ownerName === "string" ? ownerName.trim() : ownerName;
//         const normalizedCity = typeof city === "string" ? city.trim() : city;
//         const normalizedServiceArea = typeof serviceArea === "string" ? serviceArea.trim() : serviceArea;

//         // Validate required fields
//         if (!normalizedEmail || !normalizedPassword || !vendor_id) {
//             return res.status(400).json({ success: false, message: "email, password and vendor_id are required" });
//         }

//         if (!normalizedBusinessName || !normalizedOwnerName || !normalizedCity || !normalizedServiceArea) {
//             return res.status(400).json({ success: false, message: "businessName, ownerName, city, and serviceArea are required" });
//         }

//         if (!mongoose.isValidObjectId(vendor_id)) {
//             return res.status(400).json({ success: false, message: "Invalid vendor_id" });
//         }

//         const vendor = await Vendor.findById(vendor_id);
//         if (!vendor) {
//             return res.status(404).json({ success: false, message: "Vendor not found" });
//         }
//         if (vendor.status !== "approved") {
//             return res.status(400).json({ success: false, message: "Vendor is not approved" });
//         }

//         // Enforce unique email across users
//         const existingUser = await User.findOne({ email: normalizedEmail });
//         if (existingUser) {
//             return res.status(409).json({ success: false, message: "User with this email already exists" });
//         }

//         // Process categories arrays
//         let processedCategories = [];
//         if (Array.isArray(categories)) {
//             processedCategories = categories.filter(c => c && c.trim());
//         } else if (typeof categories === 'string' && categories.trim()) {
//             processedCategories = categories.split(',').map(c => c.trim()).filter(c => c);
//         }

//         let processedOthersCategories = [];
//         if (Array.isArray(othersCategories)) {
//             processedOthersCategories = othersCategories.filter(c => c && c.trim());
//         } else if (typeof othersCategories === 'string' && othersCategories.trim()) {
//             processedOthersCategories = othersCategories.split(',').map(c => c.trim()).filter(c => c);
//         }

//         const userData = {
//             role: "vendor",
//             email: normalizedEmail,
//             password: normalizedPassword,
//             phone_number: normalizedPhoneNumber || null,
//             vendor_id: vendor._id,
//             businessName: normalizedBusinessName,
//             ownerName: normalizedOwnerName,
//             city: normalizedCity,
//             serviceArea: normalizedServiceArea,
//             categories: processedCategories,
//             othersCategories: processedOthersCategories,
//             is_active: true,
//         };

//         console.log("Creating user with data:", userData);

//         const user = new User(userData);

//         await user.save();

//         console.log("User saved successfully:", user.toObject());

//         const savedUser = user.toObject();
//         delete savedUser.password; // don't send hashed password back
//         return res.status(201).json({
//             success: true,
//             message: "Vendor user created successfully",
//             data: savedUser
//         });

//     } catch (error) {
//         // Duplicate key safety net
//         if (error && error.code === 11000) {
//             return res.status(409).json({ success: false, message: "User with this email already exists" });
//         }
//         console.error("createVendorUser error:", error);
//         return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
//     }
// };

// const approveVendor = async (req, res) => {
//     try {
//         const { vendor_id } = req.body;
//         if (!vendor_id || !mongoose.isValidObjectId(vendor_id)) {
//             return res.status(400).json({ success: false, message: "Valid vendor_id is required" });
//         }

//         const vendor = await Vendor.findById(vendor_id);
//         if (!vendor) {
//             return res.status(404).json({ success: false, message: "Vendor not found" });
//         }

//         vendor.status = "approved";
//         await vendor.save();

//         return res.status(200).json({ success: true, message: "Vendor approved", data: { vendor_id: vendor._id } });
//     } catch (error) {
//         console.error("approveVendor error:", error);
//         return res.status(500).json({ success: false, message: "Internal Server Error" });
//     }
// };

// const setUserActiveState = async (req, res) => {
//     try {
//         const { user_id } = req.params;
//         const { is_active } = req.body;

//         if (!mongoose.isValidObjectId(user_id)) {
//             return res.status(400).json({ success: false, message: "Invalid user_id" });
//         }
//         if (typeof is_active !== "boolean") {
//             return res.status(400).json({ success: false, message: "is_active must be boolean" });
//         }

//         const user = await User.findByIdAndUpdate(user_id, { is_active }, { new: true });
//         if (!user) {
//             return res.status(404).json({ success: false, message: "User not found" });
//         }

//         return res.status(200).json({ success: true, message: "User state updated", data: { id: user._id, is_active: user.is_active } });
//     } catch (error) {
//         console.error("setUserActiveState error:", error);
//         return res.status(500).json({ success: false, message: "Internal Server Error" });
//     }
// };

// // Update existing vendor user (by vendor_id) and sync vendor details
// const updateVendorAndUser = async (req, res) => {
//     try {
//         const { vendor_id } = req.params;
//         if (!mongoose.isValidObjectId(vendor_id)) {
//             return res.status(400).json({ success: false, message: "Invalid vendor_id" });
//         }

//         const {
//             // email is intentionally ignored for updates to avoid unique conflicts
//             password,
//             phone_number,
//             businessName,
//             ownerName,
//             city,
//             serviceArea,
//             categories,
//             othersCategories,
//         } = req.body || {};

//         const vendor = await Vendor.findById(vendor_id);
//         if (!vendor) {
//             return res.status(404).json({ success: false, message: "Vendor not found" });
//         }

//         // Find the existing vendor user
//         const user = await User.findOne({ vendor_id });
//         if (!user) {
//             return res.status(404).json({ success: false, message: "Vendor user not found for this vendor_id" });
//         }

//         // Update user fields if provided
//         if (typeof phone_number !== "undefined") {
//             user.phone_number = typeof phone_number === "string" ? phone_number.trim() : phone_number;
//         }
//         if (typeof businessName !== "undefined") {
//             user.businessName = typeof businessName === "string" ? businessName.trim() : businessName;
//         }
//         if (typeof ownerName !== "undefined") {
//             user.ownerName = typeof ownerName === "string" ? ownerName.trim() : ownerName;
//         }
//         if (typeof city !== "undefined") {
//             user.city = typeof city === "string" ? city.trim() : city;
//         }
//         if (typeof serviceArea !== "undefined") {
//             user.serviceArea = typeof serviceArea === "string" ? serviceArea.trim() : serviceArea;
//         }
//         if (typeof categories !== "undefined") {
//             if (Array.isArray(categories)) {
//                 user.categories = categories.filter(c => c && String(c).trim());
//             } else if (typeof categories === "string" && categories.trim()) {
//                 user.categories = categories.split(',').map(c => c.trim()).filter(Boolean);
//             }
//         }
//         if (typeof othersCategories !== "undefined") {
//             if (Array.isArray(othersCategories)) {
//                 user.othersCategories = othersCategories.filter(c => c && String(c).trim());
//             } else if (typeof othersCategories === "string" && othersCategories.trim()) {
//                 user.othersCategories = othersCategories.split(',').map(c => c.trim()).filter(Boolean);
//             }
//         }
//         if (typeof password === "string" && password.trim()) {
//             user.password = password.trim(); // pre-save hook will hash
//         }

//         await user.save();

//         // Sync vendor document with provided details as well
//         const vendorUpdate = {};
//         if (typeof businessName !== "undefined") vendorUpdate.businessName = businessName;
//         if (typeof ownerName !== "undefined") vendorUpdate.ownerName = ownerName;
//         if (typeof city !== "undefined") vendorUpdate.city = city;
//         if (typeof serviceArea !== "undefined") vendorUpdate.serviceArea = serviceArea;
//         if (typeof categories !== "undefined") {
//             vendorUpdate.categories = Array.isArray(categories)
//                 ? categories.filter(c => c && String(c).trim())
//                 : (typeof categories === "string" && categories.trim() ? categories.split(',').map(c => c.trim()).filter(Boolean) : vendor.categories);
//         }
//         if (typeof othersCategories !== "undefined") {
//             vendorUpdate.othersCategories = Array.isArray(othersCategories)
//                 ? othersCategories.filter(c => c && String(c).trim())
//                 : (typeof othersCategories === "string" && othersCategories.trim() ? othersCategories.split(',').map(c => c.trim()).filter(Boolean) : vendor.othersCategories);
//         }

//         if (Object.keys(vendorUpdate).length > 0) {
//             await Vendor.findByIdAndUpdate(vendor_id, vendorUpdate, { new: true });
//         }

//         const safeUser = user.toObject();
//         delete safeUser.password;
//         return res.status(200).json({ success: true, message: "Vendor user updated successfully", data: { user: safeUser } });
//     } catch (error) {
//         console.error("updateVendorAndUser error:", error);
//         return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
//     }
// };

// module.exports = {
//     createVendorUser,
//     approveVendor,
//     setUserActiveState,
//     // Fetch a single vendor with complete data
//     getVendorById: async (req, res) => {
//         try {
//             const { id } = req.params;
//             if (!mongoose.isValidObjectId(id)) {
//                 return res.status(400).json({ success: false, message: "Invalid vendor id" });
//             }
//             const vendor = await Vendor.findById(id);
//             if (!vendor) {
//                 return res.status(404).json({ success: false, message: "Vendor not found" });
//             }
//             // Normalize nulls to arrays/objects so frontend can iterate safely
//             const safe = (arr) => Array.isArray(arr) ? arr : [];
//             const documents = vendor.documents || {};

//             // Return complete vendor data
//             const payload = {
//                 ...vendor.toObject(),
//                 images: safe(vendor.images),
//                 videos: safe(vendor.videos),
//                 files: safe(vendor.files),
//                 attachments: safe(vendor.attachments),
//                 documents: {
//                     ...Object.fromEntries(Object.entries(documents).map(([k, v]) => [k, safe(v)]))
//                 }
//             };
//             return res.status(200).json({ success: true, data: payload });
//         } catch (error) {
//             console.error("getVendorById error:", error);
//             return res.status(500).json({ success: false, message: "Internal Server Error" });
//         }
//     },
//     // Added below
//     listVendors: async (req, res) => {
//         try {
//             const { status, city, category } = req.query;

//             const query = {};
//             if (status) query.status = status;
//             if (city) query.city = city;
//             if (category) query.categories = { $in: [category] };

//             const vendors = await Vendor.find(query)
//                 .sort({ createdAt: -1 });

//             // Normalize media fields so frontend can safely render
//             const safe = (arr) => Array.isArray(arr) ? arr : [];
//             const normalized = vendors.map(v => ({
//                 ...v.toObject(),
//                 images: safe(v.images),
//                 videos: safe(v.videos),
//                 documents: Object.fromEntries(
//                     Object.entries(v.documents || {}).map(([k, val]) => [k, safe(val)])
//                 )
//             }));

//             return res.status(200).json({ success: true, data: normalized });
//         } catch (error) {
//             console.error("listVendors error:", error);
//             return res.status(500).json({ success: false, message: "Internal Server Error" });
//         }
//     },
//     updateVendorStatus: async (req, res) => {
//         try {
//             const { id } = req.params;
//             const { status } = req.body;

//             const allowed = ["pending", "approved", "rejected", "suspended"];
//             if (!mongoose.isValidObjectId(id)) {
//                 return res.status(400).json({ success: false, message: "Invalid vendor id" });
//             }
//             if (!allowed.includes(status)) {
//                 return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${allowed.join(", ")}` });
//             }

//             const vendor = await Vendor.findByIdAndUpdate(
//                 id,
//                 { status },
//                 { new: true }
//             );
//             if (!vendor) {
//                 return res.status(404).json({ success: false, message: "Vendor not found" });
//             }

//             // If vendor is rejected, remove associated vendor users so they no longer appear in users list
//             if (status === "rejected") {
//                 await User.deleteMany({ vendor_id: vendor._id });
//             }

//             return res.status(200).json({ success: true, message: "Vendor status updated", data: { id: vendor._id, status: vendor.status } });
//         } catch (error) {
//             console.error("updateVendorStatus error:", error);
//             return res.status(500).json({ success: false, message: "Internal Server Error" });
//         }
//     },
//     listVendorUsers: async (req, res) => {
//         try {
//             const { active, vendor_id, search } = req.query;
//             const query = { role: "vendor" };
//             if (typeof active !== "undefined") {
//                 if (active === "true" || active === true) query.is_active = true;
//                 if (active === "false" || active === false) query.is_active = false;
//             }
//             if (vendor_id && mongoose.isValidObjectId(vendor_id)) {
//                 query.vendor_id = vendor_id;
//             }
//             if (search) {
//                 query.email = { $regex: search, $options: "i" };
//             }

//             const users = await User.find(query)
//                 .populate({ path: "vendor_id", select: "businessName status city serviceArea" })
//                 .sort({ createdAt: -1 });

//             return res.status(200).json({ success: true, data: users });
//         } catch (error) {
//             console.error("listVendorUsers error:", error);
//             return res.status(500).json({ success: false, message: "Internal Server Error" });
//         }
//     },
//     updateVendorAndUser
// };



const mongoose = require("mongoose");
const User = require("../models/user");
const Vendor = require("../models/vendorRegister");
const Customer = require("../models/customer");
const Review = require("../models/review");

const createVendorUser = async (req, res) => {
    try {
        const {
            email,
            password,
            phone_number, 
            vendor_id,
            businessName,
            ownerName,
            city,
            serviceArea,
            categories,
            othersCategories
        } = req.body;

        console.log("Raw request body:", req.body);
        console.log("Extracted fields:", {
            email,
            password: password ? "***" : "missing",
            phone_number,
            vendor_id,
            businessName,
            ownerName,
            city,
            serviceArea,
            categories,
            othersCategories
        });

        // Normalize inputs
        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : email;
        const normalizedPassword = typeof password === "string" ? password.trim() : password;
        const normalizedPhoneNumber = typeof phone_number === "string" ? phone_number.trim() : phone_number;
        const normalizedBusinessName = typeof businessName === "string" ? businessName.trim() : businessName;
        const normalizedOwnerName = typeof ownerName === "string" ? ownerName.trim() : ownerName;
        const normalizedCity = typeof city === "string" ? city.trim() : city;
        const normalizedServiceArea = typeof serviceArea === "string" ? serviceArea.trim() : serviceArea;

        // Validate required fields
        if (!normalizedEmail || !normalizedPassword || !vendor_id) {
            return res.status(400).json({ success: false, message: "email, password and vendor_id are required" });
        }

        if (!normalizedBusinessName || !normalizedOwnerName || !normalizedCity || !normalizedServiceArea) {
            return res.status(400).json({ success: false, message: "businessName, ownerName, city, and serviceArea are required" });
        }

        if (!mongoose.isValidObjectId(vendor_id)) {
            return res.status(400).json({ success: false, message: "Invalid vendor_id" });
        }

        const vendor = await Vendor.findById(vendor_id);
        if (!vendor) {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }
        if (vendor.status !== "approved") {
            return res.status(400).json({ success: false, message: "Vendor is not approved" });
        }

        // Enforce unique email across users
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "User with this email already exists" });
        }

        // Process categories arrays
        let processedCategories = [];
        if (Array.isArray(categories)) {
            processedCategories = categories.filter(c => c && c.trim());
        } else if (typeof categories === 'string' && categories.trim()) {
            processedCategories = categories.split(',').map(c => c.trim()).filter(c => c);
        }

        let processedOthersCategories = [];
        if (Array.isArray(othersCategories)) {
            processedOthersCategories = othersCategories.filter(c => c && c.trim());
        } else if (typeof othersCategories === 'string' && othersCategories.trim()) {
            processedOthersCategories = othersCategories.split(',').map(c => c.trim()).filter(c => c);
        }

        const userData = {
            role: "vendor",
            email: normalizedEmail,
            password: normalizedPassword,
            phone_number: normalizedPhoneNumber || null,
            vendor_id: vendor._id,
            businessName: normalizedBusinessName,
            ownerName: normalizedOwnerName,
            city: normalizedCity,
            serviceArea: normalizedServiceArea,
            categories: processedCategories,
            othersCategories: processedOthersCategories,
            is_active: true,
        };

        console.log("📝 [Admin] Creating vendor user with data:", {
            email: normalizedEmail,
            vendor_id: vendor._id,
            businessName: normalizedBusinessName
        });

        const user = new User(userData);

        await user.save();

        console.log("✅ [Admin] User saved successfully:", {
            user_id: user._id,
            email: user.email,
            vendor_id: user.vendor_id
        });

        const savedUser = user.toObject();
        delete savedUser.password; // don't send hashed password back
        return res.status(201).json({
            success: true,
            message: "Vendor user created successfully",
            data: savedUser
        });

    } catch (error) {
        // Duplicate key safety net
        if (error && error.code === 11000) {
            return res.status(409).json({ success: false, message: "User with this email already exists" });
        }
        console.error("createVendorUser error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

const approveVendor = async (req, res) => {
    try {
        const { vendor_id } = req.body;
        if (!vendor_id || !mongoose.isValidObjectId(vendor_id)) {
            return res.status(400).json({ success: false, message: "Valid vendor_id is required" });
        }

        const vendor = await Vendor.findById(vendor_id);
        if (!vendor) {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }

        vendor.status = "approved";
        await vendor.save();

        return res.status(200).json({ success: true, message: "Vendor approved", data: { vendor_id: vendor._id } });
    } catch (error) {
        console.error("approveVendor error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const setUserActiveState = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { is_active } = req.body;

        if (!mongoose.isValidObjectId(user_id)) {
            return res.status(400).json({ success: false, message: "Invalid user_id" });
        }
        if (typeof is_active !== "boolean") {
            return res.status(400).json({ success: false, message: "is_active must be boolean" });
        }

        const user = await User.findByIdAndUpdate(user_id, { is_active }, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, message: "User state updated", data: { id: user._id, is_active: user.is_active } });
    } catch (error) {
        console.error("setUserActiveState error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Update existing vendor user (by vendor_id) and sync vendor details
const updateVendorAndUser = async (req, res) => {
    try {
        const { vendor_id } = req.params;
        if (!mongoose.isValidObjectId(vendor_id)) {
            return res.status(400).json({ success: false, message: "Invalid vendor_id" });
        }

        const {
            // email is intentionally ignored for updates to avoid unique conflicts
            password,
            phone_number,
            businessName,
            ownerName,
            city,
            serviceArea,
            categories,
            othersCategories,
        } = req.body || {};

        const vendor = await Vendor.findById(vendor_id);
        if (!vendor) {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }

        // Find the existing vendor user
        const user = await User.findOne({ vendor_id });
        if (!user) {
            return res.status(404).json({ success: false, message: "Vendor user not found for this vendor_id" });
        }

        // Update user fields if provided
        if (typeof phone_number !== "undefined") {
            user.phone_number = typeof phone_number === "string" ? phone_number.trim() : phone_number;
        }
        if (typeof businessName !== "undefined") {
            user.businessName = typeof businessName === "string" ? businessName.trim() : businessName;
        }
        if (typeof ownerName !== "undefined") {
            user.ownerName = typeof ownerName === "string" ? ownerName.trim() : ownerName;
        }
        if (typeof city !== "undefined") {
            user.city = typeof city === "string" ? city.trim() : city;
        }
        if (typeof serviceArea !== "undefined") {
            user.serviceArea = typeof serviceArea === "string" ? serviceArea.trim() : serviceArea;
        }
        if (typeof categories !== "undefined") {
            if (Array.isArray(categories)) {
                user.categories = categories.filter(c => c && String(c).trim());
            } else if (typeof categories === "string" && categories.trim()) {
                user.categories = categories.split(',').map(c => c.trim()).filter(Boolean);
            }
        }
        if (typeof othersCategories !== "undefined") {
            if (Array.isArray(othersCategories)) {
                user.othersCategories = othersCategories.filter(c => c && String(c).trim());
            } else if (typeof othersCategories === "string" && othersCategories.trim()) {
                user.othersCategories = othersCategories.split(',').map(c => c.trim()).filter(Boolean);
            }
        }
        if (typeof password === "string" && password.trim()) {
            user.password = password.trim(); // pre-save hook will hash
        }

        await user.save();

        // Sync vendor document with provided details as well
        const vendorUpdate = {};
        if (typeof businessName !== "undefined") vendorUpdate.businessName = businessName;
        if (typeof ownerName !== "undefined") vendorUpdate.ownerName = ownerName;
        if (typeof city !== "undefined") vendorUpdate.city = city;
        if (typeof serviceArea !== "undefined") vendorUpdate.serviceArea = serviceArea;
        if (typeof categories !== "undefined") {
            vendorUpdate.categories = Array.isArray(categories)
                ? categories.filter(c => c && String(c).trim())
                : (typeof categories === "string" && categories.trim() ? categories.split(',').map(c => c.trim()).filter(Boolean) : vendor.categories);
        }
        if (typeof othersCategories !== "undefined") {
            vendorUpdate.othersCategories = Array.isArray(othersCategories)
                ? othersCategories.filter(c => c && String(c).trim())
                : (typeof othersCategories === "string" && othersCategories.trim() ? othersCategories.split(',').map(c => c.trim()).filter(Boolean) : vendor.othersCategories);
        }

        if (Object.keys(vendorUpdate).length > 0) {
            await Vendor.findByIdAndUpdate(vendor_id, vendorUpdate, { new: true });
        }

        const safeUser = user.toObject();
        delete safeUser.password;
        return res.status(200).json({ success: true, message: "Vendor user updated successfully", data: { user: safeUser } });
    } catch (error) {
        console.error("updateVendorAndUser error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

module.exports = {
    createVendorUser,
    approveVendor,
    setUserActiveState,
    // Fetch a single vendor with complete data
    getVendorById: async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({ success: false, message: "Invalid vendor id" });
            }
            const vendor = await Vendor.findById(id);
            if (!vendor) {
                return res.status(404).json({ success: false, message: "Vendor not found" });
            }
            // Normalize nulls to arrays/objects so frontend can iterate safely
            const safe = (arr) => Array.isArray(arr) ? arr : [];
            const documents = vendor.documents || {};

            // Return complete vendor data
            const payload = {
                ...vendor.toObject(),
                images: safe(vendor.images),
                videos: safe(vendor.videos),
                files: safe(vendor.files),
                attachments: safe(vendor.attachments),
                documents: {
                    ...Object.fromEntries(Object.entries(documents).map(([k, v]) => [k, safe(v)]))
                }
            };
            return res.status(200).json({ success: true, data: payload });
        } catch (error) {
            console.error("getVendorById error:", error);
            return res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    },
    // Added below
    listVendors: async (req, res) => {
        try {
            const { status, city, category } = req.query;

            const query = {};
            if (status) query.status = status;
            if (city) query.city = city;
            if (category) query.categories = { $in: [category] };

            // BUG #10: N+1 Query Problem - fetching vendors without proper population
            // Each vendor's user data fetched separately, causing N+1 queries
            // Should use aggregation or populate to fetch all data in one query
            const vendors = await Vendor.find(query)
                .sort({ createdAt: -1 });

            // Normalize media fields so frontend can safely render
            const safe = (arr) => Array.isArray(arr) ? arr : [];
            
            // BUG #10: For each vendor, we check if user exists - this causes N+1 problem
            // If we have 100 vendors, this makes 100+ database queries instead of 1-2
            const normalized = vendors.map(v => ({
                ...v.toObject(),
                images: safe(v.images),
                videos: safe(v.videos),
                documents: Object.fromEntries(
                    Object.entries(v.documents || {}).map(([k, val]) => [k, safe(val)])
                )
            }));

            return res.status(200).json({ success: true, data: normalized });
        } catch (error) {
            console.error("listVendors error:", error);
            return res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    },
    updateVendorStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status,hasUser } = req.body;
            console.log("status",status)

            const allowed = ["pending", "approved", "rejected", "suspended"];
            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({ success: false, message: "Invalid vendor id" });
            }
            if (!allowed.includes(status)) {
                return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${allowed.join(", ")}` });
            }

            // BUG #3: Race condition - no transaction/locking, multiple admins can update simultaneously
            // If two admins update same vendor at same time, last write wins, causing data inconsistency
            const vendor = await Vendor.findByIdAndUpdate(
                id,
                { status, hasUser },
                { new: true }
            );
            if (!vendor) {
                return res.status(404).json({ success: false, message: "Vendor not found" });
            }
          
            // BUG #3: User operations happen after vendor update, no rollback if this fails
            if (status === "approved") {
                // Reactivate vendor users (if previously deactivated)
                // BUG: This deleteMany is wrong - should be updateMany to set is_active: true
                await User.deleteMany(
                    { vendor_id: vendor._id },
                    { is_active: true }
                );
                console.log("Vendor users reactivated due to approval");
            }

            // If vendor is rejected, remove associated vendor users so they no longer appear in users list
            if (status === "rejected") {
                await User.deleteMany({ vendor_id: vendor._id });
            }

            return res.status(200).json({ success: true, message: "Vendor status updated", data: { id: vendor._id, status: vendor.status, hasUser: vendor.hasUser } });
        } catch (error) {
            // BUG #51: Error message leaks internal details in development
            // Error stack trace or internal error details exposed
            // Helps attacker understand system structure
            console.error("updateVendorStatus error:", error);
            // BUG #51: Generic error but console.log might expose sensitive info
            return res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    },
    listVendorUsers: async (req, res) => {
        try {
            const { active, vendor_id, search } = req.query;
            const query = { role: "vendor" };
            if (typeof active !== "undefined") {
                if (active === "true" || active === true) query.is_active = true;
                if (active === "false" || active === false) query.is_active = false;
            }
            if (vendor_id && mongoose.isValidObjectId(vendor_id)) {
                query.vendor_id = vendor_id;
            }
            // BUG #46: Regex search vulnerable to ReDoS (Regular Expression Denial of Service)
            // Malicious search pattern can cause server to hang
            // No input sanitization, user can send complex regex patterns
            if (search) {
                query.email = { $regex: search, $options: "i" };
            }

            const users = await User.find(query)
                .populate({ path: "vendor_id", select: "businessName status city serviceArea" })
                .sort({ createdAt: -1 });

            return res.status(200).json({ success: true, data: users });
        } catch (error) {
            console.error("listVendorUsers error:", error);
            return res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    },
    updateVendorAndUser,
    // Get Dashboard Statistics
    getDashboardStats: async (req, res) => {
        try {
            // BUG #15: Dashboard stats calculation race - stats calculated while data is being updated
            // If vendor status updated during this calculation, stats become inconsistent
            // No locking or transaction, concurrent updates cause incorrect counts
            // BUG #53: Stats query doesn't filter deleted/inactive vendors
            // Count includes vendors that might be soft-deleted or inactive
            // Total Active Vendors (approved vendors)
            const activeVendors = await Vendor.countDocuments({ 
                status: "approved"
                // BUG #53: Missing isActive: true filter
            });

            // BUG #15: Race condition - vendor status might change between count and aggregate
            // Total Vendors by Status
            const vendorStatusCounts = await Vendor.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Convert to object for easier access
            const vendorStatus = {
                approved: 0,
                pending: 0,
                rejected: 0,
                suspended: 0
            };
            vendorStatusCounts.forEach(item => {
                vendorStatus[item._id] = item.count;
            });

            // Total Platform Users (all users)
            const totalUsers = await User.countDocuments({});

            // Total Customers/Bookings
            const totalBookings = await Customer.countDocuments({});

            // Total Revenue (sum of all customer budgets)
            const revenueResult = await Customer.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: { $ifNull: ["$budget", 0] } }
                    }
                }
            ]);
            const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

            // Monthly Revenue (last 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const monthlyRevenue = await Customer.aggregate([
                {
                    $match: {
                        date: { $gte: sixMonthsAgo, $ne: null }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$date" },
                            month: { $month: "$date" }
                        },
                        revenue: { $sum: { $ifNull: ["$budget", 0] } }
                    }
                },
                {
                    $sort: { "_id.year": 1, "_id.month": 1 }
                }
            ]);

            // Format monthly revenue with month names
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const formattedMonthlyRevenue = monthlyRevenue.map(item => ({
                month: monthNames[item._id.month - 1] || `Month ${item._id.month}`,
                revenue: item.revenue
            }));

            // Get recent bookings (last 10)
            const recentBookings = await Customer.find({})
                .sort({ createdAt: -1 })
                .limit(10)
                .select('name email phoneNo date budget status type city')
                .lean();

            // Calculate pending and processed payouts (if status field exists)
            const bookingsWithStatus = await Customer.find({}).lean();
            const pendingPayouts = bookingsWithStatus
                .filter(b => b.status === 'pending' || !b.status)
                .reduce((sum, b) => sum + (b.budget || 0), 0);
            
            const processedPayouts = bookingsWithStatus
                .filter(b => b.status === 'completed' || b.status === 'paid')
                .reduce((sum, b) => sum + (b.budget || 0), 0);

            return res.status(200).json({
                success: true,
                data: {
                    totalRevenue,
                    activeVendors,
                    totalBookings,
                    totalUsers,
                    vendorStatus,
                    monthlyRevenue: formattedMonthlyRevenue.length > 0 ? formattedMonthlyRevenue : [
                        { month: "Jan", revenue: 0 },
                        { month: "Feb", revenue: 0 },
                        { month: "Mar", revenue: 0 },
                        { month: "Apr", revenue: 0 },
                        { month: "May", revenue: 0 },
                        { month: "Jun", revenue: 0 }
                    ],
                    recentBookings,
                    pendingPayouts,
                    processedPayouts
                }
            });
        } catch (error) {
            console.error("getDashboardStats error:", error);
            return res.status(500).json({ 
                success: false, 
                message: "Internal Server Error",
                error: error.message 
            });
        }
    },
    // Reset password by email (for forgot password)
    resetPasswordByEmail: async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ success: false, message: "Email and password are required" });
            }

            const normalizedEmail = email.trim().toLowerCase();

            // Find user by email
            const user = await User.findOne({ email: normalizedEmail });
            if (!user) {
                return res.status(404).json({ success: false, message: "Email not found" });
            }

            // BUG #44: Password reset without old password verification
            // Anyone with email can reset password without knowing current password
            // No rate limiting, can be brute forced
            // Hash the new password
            const bcrypt = require("bcrypt");
            // BUG #44: No password strength validation
            // Can set weak password like "123" or "password"
            const hashedPassword = await bcrypt.hash(password.trim(), 10);

            // Update password
            user.password = hashedPassword;
            await user.save();

            return res.status(200).json({
                success: true,
                message: "Password updated successfully",
                data: { email: user.email }
            });
        } catch (error) {
            console.error("resetPasswordByEmail error:", error);
            return res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    },
    // Review Management Functions
    createReview: async (req, res) => {
        try {
            const { name, role, text, stars, image } = req.body;

            if (!name || !role || !text || !stars || !image) {
                return res.status(400).json({
                    success: false,
                    message: "Name, role, text, stars, and image are required"
                });
            }

            if (stars < 1 || stars > 5) {
                return res.status(400).json({
                    success: false,
                    message: "Stars must be between 1 and 5"
                });
            }

            const review = new Review({
                name: name.trim(),
                role: role.trim(),
                text: text.trim(),
                stars: parseInt(stars),
                image: image.trim(),
                isActive: true
            });

            await review.save();

            return res.status(201).json({
                success: true,
                message: "Review created successfully",
                data: review
            });
        } catch (error) {
            console.error("createReview error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },
    listReviews: async (req, res) => {
        try {
            const { active } = req.query;
            const query = {};

            if (active !== undefined) {
                query.isActive = active === "true" || active === true;
            }

            const reviews = await Review.find(query)
                .sort({ createdAt: -1 });

            return res.status(200).json({
                success: true,
                data: reviews
            });
        } catch (error) {
            console.error("listReviews error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },
    getReviewById: async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid review ID"
                });
            }

            const review = await Review.findById(id);

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: "Review not found"
                });
            }

            return res.status(200).json({
                success: true,
                data: review
            });
        } catch (error) {
            console.error("getReviewById error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },
    updateReview: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, role, text, stars, image, isActive } = req.body;

            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid review ID"
                });
            }

            const review = await Review.findById(id);

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: "Review not found"
                });
            }

            if (stars !== undefined && (stars < 1 || stars > 5)) {
                return res.status(400).json({
                    success: false,
                    message: "Stars must be between 1 and 5"
                });
            }

            // Update fields
            if (name !== undefined) review.name = name.trim();
            if (role !== undefined) review.role = role.trim();
            if (text !== undefined) review.text = text.trim();
            if (stars !== undefined) review.stars = parseInt(stars);
            if (image !== undefined) review.image = image.trim();
            if (isActive !== undefined) review.isActive = isActive;

            await review.save();

            return res.status(200).json({
                success: true,
                message: "Review updated successfully",
                data: review
            });
        } catch (error) {
            console.error("updateReview error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    },
    deleteReview: async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid review ID"
                });
            }

            const review = await Review.findByIdAndDelete(id);

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: "Review not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Review deleted successfully"
            });
        } catch (error) {
            console.error("deleteReview error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    }
};