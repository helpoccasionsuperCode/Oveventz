require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/user");
const VendorRegister = require("./src/models/vendorRegister");
const Customer = require("./src/models/customer");
const connectDB = require("./src/config/db");

async function cleanAllAdminData() {
    try {
        // Connect to database
        await connectDB();
        console.log("✅ Connected to MongoDB\n");

        let totalDeleted = 0;

        // ========== STEP 1: Delete All Customer Requests ==========
        console.log("🗑️  Starting cleanup of Customer Requests...");
        const customerDeleteResult = await Customer.deleteMany({});
        console.log(`   ✅ Deleted ${customerDeleteResult.deletedCount} customer requests`);
        totalDeleted += customerDeleteResult.deletedCount;
        console.log("");

        // ========== STEP 2: Delete All Vendor Data ==========
        console.log("🗑️  Starting cleanup of Vendor Data...");
        
        // Step 2.1: Get all vendors first
        const vendors = await VendorRegister.find({});
        const vendorIds = vendors.map(v => v._id);
        console.log(`   📋 Found ${vendors.length} vendor(s) to delete`);

        // Step 2.2: Delete all users with vendor_id references
        let userDeleteResult = { deletedCount: 0 };
        if (vendorIds.length > 0) {
            userDeleteResult = await User.deleteMany({ 
                vendor_id: { $in: vendorIds } 
            });
            console.log(`   ✅ Deleted ${userDeleteResult.deletedCount} vendor user account(s)`);
            totalDeleted += userDeleteResult.deletedCount;
        } else {
            console.log("   ⚠️  No vendors found, skipping user deletion");
        }

        // Step 2.3: Delete all vendor registrations
        const vendorDeleteResult = await VendorRegister.deleteMany({});
        console.log(`   ✅ Deleted ${vendorDeleteResult.deletedCount} vendor registration(s)`);
        totalDeleted += vendorDeleteResult.deletedCount;
        console.log("");

        // ========== STEP 3: Final Verification ==========
        console.log("🔍 Final verification...");
        const remainingCustomers = await Customer.countDocuments({});
        const remainingVendors = await VendorRegister.countDocuments({});
        const remainingVendorUsers = await User.countDocuments({ role: "vendor" });

        if (remainingCustomers > 0 || remainingVendors > 0 || remainingVendorUsers > 0) {
            console.log("⚠️  Warning: Some data still exists!");
            if (remainingCustomers > 0) console.log(`   - ${remainingCustomers} customer request(s) still exist`);
            if (remainingVendors > 0) console.log(`   - ${remainingVendors} vendor(s) still exist`);
            if (remainingVendorUsers > 0) console.log(`   - ${remainingVendorUsers} vendor user(s) still exist`);
        } else {
            console.log("✅ All data cleaned successfully!");
            console.log(`   - Customer requests: 0`);
            console.log(`   - Vendors: 0`);
            console.log(`   - Vendor users: 0`);
        }

        // ========== SUMMARY ==========
        console.log("\n" + "=".repeat(60));
        console.log("✅ DATABASE CLEANUP COMPLETED!");
        console.log("=".repeat(60));
        console.log(`📊 Total records deleted: ${totalDeleted}`);
        console.log(`   - Customer requests: ${customerDeleteResult.deletedCount}`);
        console.log(`   - Vendor registrations: ${vendorDeleteResult.deletedCount}`);
        console.log(`   - Vendor user accounts: ${userDeleteResult.deletedCount}`);
        console.log("=".repeat(60));
        console.log("✨ Admin dashboard will now show no customer requests or vendor data.");
        console.log("=".repeat(60));

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
console.log("🚀 Starting database cleanup...");
console.log("⚠️  WARNING: This will delete ALL customer requests and vendor data!");
console.log("");
cleanAllAdminData();

