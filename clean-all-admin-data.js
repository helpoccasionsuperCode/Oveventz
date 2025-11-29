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

        // ========== STEP 1: Delete All Customer Requests/Bookings ==========
        console.log("🗑️  Starting cleanup of Customer Requests/Bookings...");
        const customerDeleteResult = await Customer.deleteMany({});
        console.log(`   ✅ Deleted ${customerDeleteResult.deletedCount} customer requests/bookings`);
        totalDeleted += customerDeleteResult.deletedCount;
        console.log("");

        // ========== STEP 2: Delete All Vendor Data ==========
        console.log("🗑️  Starting cleanup of Vendor Data...");
        
        // Step 2.1: Get all vendors first
        const vendors = await VendorRegister.find({});
        const vendorIds = vendors.map(v => v._id);
        console.log(`   📋 Found ${vendors.length} vendor(s) to delete`);

        // Step 2.2: Delete all vendor registrations
        const vendorDeleteResult = await VendorRegister.deleteMany({});
        console.log(`   ✅ Deleted ${vendorDeleteResult.deletedCount} vendor registration(s)`);
        totalDeleted += vendorDeleteResult.deletedCount;
        console.log("");

        // ========== STEP 3: Delete All Users EXCEPT Admin ==========
        console.log("🗑️  Starting cleanup of Users (keeping only admin)...");
        
        // Step 3.1: Count admin users before deletion
        const adminUsersBefore = await User.find({ role: "admin" });
        console.log(`   📋 Found ${adminUsersBefore.length} admin user(s) to keep`);
        
        // Step 3.2: Delete all non-admin users (vendor, customer, and any with vendor_id)
        const nonAdminDeleteResult = await User.deleteMany({ 
            role: { $ne: "admin" } 
        });
        console.log(`   ✅ Deleted ${nonAdminDeleteResult.deletedCount} non-admin user(s)`);
        totalDeleted += nonAdminDeleteResult.deletedCount;
        
        // Step 3.3: Also delete any remaining users with vendor_id (in case role is not set properly, but keep admin)
        const vendorUserDeleteResult = await User.deleteMany({ 
            vendor_id: { $ne: null },
            role: { $ne: "admin" }  // Make sure we don't delete admin users
        });
        if (vendorUserDeleteResult.deletedCount > 0) {
            console.log(`   ✅ Deleted ${vendorUserDeleteResult.deletedCount} additional user(s) with vendor_id`);
            totalDeleted += vendorUserDeleteResult.deletedCount;
        }
        console.log("");

        // ========== STEP 4: Final Verification ==========
        console.log("🔍 Final verification...");
        const remainingCustomers = await Customer.countDocuments({});
        const remainingVendors = await VendorRegister.countDocuments({});
        const remainingUsers = await User.countDocuments({});
        const adminUsers = await User.find({ role: "admin" });

        if (remainingCustomers > 0 || remainingVendors > 0) {
            console.log("⚠️  Warning: Some data still exists!");
            if (remainingCustomers > 0) console.log(`   - ${remainingCustomers} customer request(s) still exist`);
            if (remainingVendors > 0) console.log(`   - ${remainingVendors} vendor(s) still exist`);
        } else {
            console.log("✅ All data cleaned successfully!");
            console.log(`   - Customer requests: 0`);
            console.log(`   - Vendors: 0`);
        }
        
        console.log(`\n👤 User Status:`);
        console.log(`   - Total users remaining: ${remainingUsers}`);
        console.log(`   - Admin users: ${adminUsers.length}`);
        if (adminUsers.length > 0) {
            adminUsers.forEach(admin => {
                console.log(`     ✓ ${admin.email} (${admin.role})`);
            });
        }

        // ========== SUMMARY ==========
        console.log("\n" + "=".repeat(60));
        console.log("✅ DATABASE CLEANUP COMPLETED!");
        console.log("=".repeat(60));
        console.log(`📊 Total records deleted: ${totalDeleted}`);
        console.log(`   - Customer requests/bookings: ${customerDeleteResult.deletedCount}`);
        console.log(`   - Vendor registrations: ${vendorDeleteResult.deletedCount}`);
        console.log(`   - Non-admin users: ${nonAdminDeleteResult.deletedCount}`);
        console.log("=".repeat(60));
        console.log(`👤 Admin credentials preserved: ${adminUsers.length} admin user(s)`);
        console.log("✨ Admin dashboard will now show:");
        console.log("   - No customer requests/bookings");
        console.log("   - No vendor data");
        console.log("   - Only admin user(s) in users list");
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
console.log("⚠️  WARNING: This will delete:");
console.log("   - ALL customer requests/bookings");
console.log("   - ALL vendor data");
console.log("   - ALL users EXCEPT admin credentials");
console.log("");
cleanAllAdminData();

