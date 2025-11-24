require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/user");
const VendorRegister = require("./src/models/vendorRegister");
const connectDB = require("./src/config/db");

const EMAIL_TO_DELETE = "manifest.rohit@gmail.com";

async function cleanVendorData() {
    try {
        // Connect to database
        await connectDB();
        console.log("✅ Connected to MongoDB\n");

        let deletedCount = 0;
        const emailLower = EMAIL_TO_DELETE.toLowerCase().trim();

        // Step 1: Find vendor by email
        const vendor = await VendorRegister.findOne({ email: emailLower });
        
        if (!vendor) {
            console.log(`⚠️  No vendor found with email: ${EMAIL_TO_DELETE}`);
        } else {
            console.log(`📋 Found vendor: ${vendor.businessName} (ID: ${vendor._id})`);
            
            // Step 2: Delete all users with vendor_id pointing to this vendor
            const usersWithVendorId = await User.find({ vendor_id: vendor._id });
            if (usersWithVendorId.length > 0) {
                console.log(`🔍 Found ${usersWithVendorId.length} user(s) with vendor_id reference`);
                for (const u of usersWithVendorId) {
                    await User.deleteOne({ _id: u._id });
                    console.log(`   ✅ Deleted user: ${u.email} (ID: ${u._id})`);
                    deletedCount++;
                }
            }
            
            // Step 3: Delete vendor profile
            await VendorRegister.deleteOne({ _id: vendor._id });
            console.log(`✅ Deleted vendor profile: ${vendor.businessName}`);
            deletedCount++;
        }

        // Step 4: Find and delete all user accounts with this email (in case vendor_id wasn't set)
        const usersByEmail = await User.find({ email: emailLower });
        
        if (usersByEmail.length === 0) {
            console.log(`⚠️  No user account found with email: ${EMAIL_TO_DELETE}`);
        } else {
            console.log(`👤 Found ${usersByEmail.length} user account(s) with email: ${EMAIL_TO_DELETE}`);
            for (const user of usersByEmail) {
                await User.deleteOne({ _id: user._id });
                console.log(`   ✅ Deleted user account: ${user.email} (ID: ${user._id}, Role: ${user.role})`);
                deletedCount++;
            }
        }

        // Step 5: Double check - search for any remaining references
        console.log("\n🔍 Final check for any remaining data...");
        const remainingVendor = await VendorRegister.findOne({ email: emailLower });
        const remainingUsers = await User.find({ email: emailLower });
        
        if (remainingVendor || remainingUsers.length > 0) {
            console.log("⚠️  Warning: Some data still exists!");
            if (remainingVendor) console.log(`   - Vendor still exists: ${remainingVendor._id}`);
            if (remainingUsers.length > 0) {
                remainingUsers.forEach(u => console.log(`   - User still exists: ${u._id}`));
            }
        } else {
            console.log("✅ No remaining data found - all clean!");
        }

        console.log("\n" + "=".repeat(50));
        console.log("✅ Cleanup completed successfully!");
        console.log(`📊 Total records deleted: ${deletedCount}`);
        console.log(`📧 All data for ${EMAIL_TO_DELETE} has been deleted.`);
        console.log("✨ You can now create a new vendor with this email.");
        console.log("=".repeat(50));

    } catch (error) {
        console.error("\n❌ Error during cleanup:", error);
        throw error;
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log("\n🔌 Database connection closed");
        process.exit(0);
    }
}

// Run the cleanup
cleanVendorData();

