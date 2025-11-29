const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const { v2: cloudinary } = require("cloudinary");
const streamifier = require("streamifier");
const Vendor = require("../models/vendorRegister");

// GET /vendor/:userId/profile - Fetch current profile data
const getVendorProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        // Find user and populate vendor data
        // BUG #52: No authorization check - any user can access any vendor profile
        // User can access other vendor's profile by changing userId in URL
        // No check if req.user.id matches userId parameter
        // Vendor A can see Vendor B's profile data
        const user = await User.findById(userId).populate('vendor_id');

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.role !== "vendor") {
            return res.status(403).json({ success: false, message: "Access denied. User is not a vendor" });
        }

        if (!user.is_active) {
            return res.status(403).json({ success: false, message: "User account is inactive" });
        }

        // Prepare response data
        const profileData = {
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                phone_number: user.phone_number,
                is_active: user.is_active,
                last_login: user.last_login,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            },
            vendor: null
        };

        // Get vendor data via vendor_id (must be linked)
        let vendor = null;
        
        if (user.vendor_id) {
            vendor = user.vendor_id;
            console.log(`✅ Found vendor via vendor_id: ${vendor.businessName}`);
        } else {
            console.log(`❌ vendor_id is null for user: ${user.email}. Vendor not linked.`);
        }

        // If vendor data exists, include it
        if (vendor) {
            profileData.vendor = {
                id: vendor._id,
                userId: vendor.userId,
                businessName: vendor.businessName,
                ownerName: vendor.ownerName,
                email: vendor.email,
                phone: vendor.phone,
                city: vendor.city,
                serviceArea: vendor.serviceArea,
                socialMedia: vendor.socialMedia,
                categories: vendor.categories,
                othersCategories: vendor.othersCategories,
                images: vendor.images,
                videos: vendor.videos,
                packages: vendor.packages,
                documents: vendor.documents,
                bankDetails: vendor.bankDetails,
                status: vendor.status,
                verificationStatus: vendor.verificationStatus,
                //update
                profilePhoto: vendor.profilePhoto,
                upiId: vendor.upiId,

                isActive: vendor.isActive,
                createdAt: vendor.createdAt,
                updatedAt: vendor.updatedAt
            };
        } else {
            console.log(`⚠️ No vendor data available for user: ${user.email}`);
        }

        return res.status(200).json({
            success: true,
            message: "Profile data fetched successfully",
            data: profileData
        });

    } catch (error) {
        console.error("getVendorProfile error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// PUT /vendor/:userId/profile - Update profile data
const updateVendorProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const updateData = req.body;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        // Find user
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.role !== "vendor") {
            return res.status(403).json({ success: false, message: "Access denied. User is not a vendor" });
        }

        if (!user.is_active) {
            return res.status(403).json({ success: false, message: "User account is inactive" });
        }

        // Separate user and vendor update data
        const userUpdateData = {};
        const vendorUpdateData = {};

        // Define allowed fields for user updates (only these 3 fields)
        const allowedUserFields = ['email', 'password', 'phone_number'];
        allowedUserFields.forEach(field => {
            if (updateData[field] !== undefined) {
                userUpdateData[field] = updateData[field];
            }
        });

        // Define allowed fields for vendor updates (only these specific fields)
        const allowedVendorFields = [
            'businessName', 'ownerName', 'email', 'phone', 'city', 'serviceArea',
            'socialMedia', 'categories', 'othersCategories', 'images', 'videos',
            'packages', 'documents', 'bankDetails',
            //update
            'profilePhoto', 'upiId'
        ];

        allowedVendorFields.forEach(field => {
            if (updateData[field] !== undefined) {
                vendorUpdateData[field] = updateData[field];
            }
        });

        // Validate user email format if being updated
        if (userUpdateData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(userUpdateData.email)) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid email address"
                });
            }
            userUpdateData.email = userUpdateData.email.toLowerCase().trim();
        }

        // Validate vendor email format if being updated
        if (vendorUpdateData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(vendorUpdateData.email)) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid email address"
                });
            }
            vendorUpdateData.email = vendorUpdateData.email.toLowerCase().trim();
        }


        // Validate user password if being updated
        if (userUpdateData.password) {
            // must match strong criteria
            const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]).{8,}$/;
            if (!strongRegex.test(userUpdateData.password)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 8 chars and include uppercase, lowercase, number and special char",
                });
            }
        }


        // Validate user phone number format if being updated
        if (userUpdateData.phone_number) {
            userUpdateData.phone_number = userUpdateData.phone_number.trim();
        }

        // Validate vendor phone format if being updated
        if (vendorUpdateData.phone) {
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(vendorUpdateData.phone)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid mobile number. Please enter exactly 10 digits."
                });
            }
            vendorUpdateData.phone = vendorUpdateData.phone.replace(/\s+/g, '');
        }

        // Validate categories if being updated
        if (vendorUpdateData.categories && !Array.isArray(vendorUpdateData.categories)) {
            return res.status(400).json({
                success: false,
                message: "Categories must be an array"
            });
        }

        // Validate packages if being updated
        if (vendorUpdateData.packages && !Array.isArray(vendorUpdateData.packages)) {
            return res.status(400).json({
                success: false,
                message: "Packages must be an array"
            });
        }

        //update
        if (vendorUpdateData.upiId) {
            // basic UPI pattern: name@bank
            const upiRegex = /^[\w.\-_]{2,}@[a-zA-Z]{2,}$/;
            if (!upiRegex.test(vendorUpdateData.upiId)) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid UPI ID"
                });
            }
        }

        // Hash password if being updated
        if (userUpdateData.password) {
            const salt = await bcrypt.genSalt(10);
            userUpdateData.password = await bcrypt.hash(userUpdateData.password, salt);
        }

        // Update user data if there are user fields to update
        let updatedUser = user;
        if (Object.keys(userUpdateData).length > 0) {
            // Only include password if it exists
            const updateFields = { ...userUpdateData };
            if (!updateFields.password) {
                delete updateFields.password;
            }

            updatedUser = await User.findByIdAndUpdate(
                userId,
                updateFields,
                { new: true, runValidators: true, context: 'query' } // context: 'query' helps with some validator issues
            );
        }


        // Update vendor data if there are vendor fields to update
        let updatedVendor = null;
        if (user.vendor_id && Object.keys(vendorUpdateData).length > 0) {
            updatedVendor = await Vendor.findByIdAndUpdate(
                user.vendor_id,
                vendorUpdateData,
                { new: true, runValidators: true }
            );
        }

        // If no vendor exists but vendor data is being updated, create vendor record
        if (!user.vendor_id && Object.keys(vendorUpdateData).length > 0) {
            const newVendor = new Vendor({
                ...vendorUpdateData,
                status: 'pending' // New vendor starts as pending
            });
            updatedVendor = await newVendor.save();

            // Link vendor to user
            updatedUser = await User.findByIdAndUpdate(
                userId,
                { vendor_id: updatedVendor._id },
                { new: true }
            );
        }

        // Prepare response data (exclude password for security)
        const responseData = {
            user: {
                id: updatedUser._id,
                email: updatedUser.email,
                role: updatedUser.role,
                phone_number: updatedUser.phone_number,
                is_active: updatedUser.is_active,
                vendor_id: updatedUser.vendor_id,
                last_login: updatedUser.last_login,
                updatedAt: updatedUser.updatedAt
            }
        };

        if (updatedVendor) {
            responseData.vendor = {
                id: updatedVendor._id,
                userId: updatedVendor.userId,
                businessName: updatedVendor.businessName,
                ownerName: updatedVendor.ownerName,
                email: updatedVendor.email,
                phone: updatedVendor.phone,
                city: updatedVendor.city,
                serviceArea: updatedVendor.serviceArea,
                socialMedia: updatedVendor.socialMedia,
                categories: updatedVendor.categories,
                othersCategories: updatedVendor.othersCategories,
                images: updatedVendor.images,
                videos: updatedVendor.videos,
                packages: updatedVendor.packages,
                documents: updatedVendor.documents,
                bankDetails: updatedVendor.bankDetails,
                status: updatedVendor.status,
                verificationStatus: updatedVendor.verificationStatus,
                isActive: updatedVendor.isActive,
                updatedAt: updatedVendor.updatedAt,
                //update
                profilePhoto: updatedVendor.profilePhoto,
                upiId: updatedVendor.upiId,

            };
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: responseData
        });

    } catch (error) {
        console.error("updateVendorProfile error:", error);

        // Handle duplicate key errors
        if (error && error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email already exists"
            });
        }

        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



// for profile photo upload
// configure cloudinary (better: move to config/cloudinary.js)
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_KEY,
    api_secret: process.env.CLOUD_SECRET,
});


const uploadVendorPhoto = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "vendor_photos" },
            async (error, result) => {
                if (error) return res.status(500).json({ error });

                const user = await User.findById(userId);
                if (!user) return res.status(404).json({ msg: "User not found" });

                if (user.vendor_id) {
                    const updatedVendor = await Vendor.findByIdAndUpdate(
                        user.vendor_id,
                        { profilePhoto: result.secure_url },
                        { new: true }
                    );
                    console.log(updatedVendor);


                    // ✅ return updated vendor data
                    return res.status(200).json({
                        success: true,
                        message: "Photo uploaded successfully",
                        data: {
                            vendor: updatedVendor
                        }
                    });
                } else {
                    return res.status(400).json({ msg: "Vendor profile not found" });
                }
            }
        );

        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


module.exports = {
    getVendorProfile,
    updateVendorProfile,
    uploadVendorPhoto
};