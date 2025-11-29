const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ["admin", "vendor", "customer"],
            required: true,
            default: "vendor",
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
        },
        last_login: {
            type: Date,
            default: null,
        },
        is_active: {
            type: Boolean,
            default: true,
        },
        phone_number: {
            type: String,
            default: null,
            trim: true,
        },
        vendor_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "VendorRegister",
            default: null,
            index: true,
        },

    },
    { timestamps: { createdAt: true, updatedAt: true } }
);

UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
    // BUG #40: Password comparison doesn't handle null/undefined password
    // If password field is null or undefined, bcrypt.compare throws error
    // Should check if this.password exists before comparing
    // Edge case: user with no password can cause crash
    return bcrypt.compare(candidatePassword, this.password);
};

const UserModel = mongoose.model("users", UserSchema);

module.exports = UserModel; 