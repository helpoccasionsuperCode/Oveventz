require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const multer = require("multer");
const streamifier = require("streamifier");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");
const nodemailer = require("nodemailer");
const connectDB = require("./config/db");

// Import models & routes
const blogModel = require("./models/blogs");
const UserModel = require("./models/user");
const ReviewModel = require("./models/review");
const { vendorRegisterRoute } = require("./routes/vendorRegisterRoute");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const vendorProfileRoutes = require("./routes/vendorProfileRoutes");
const mailRoutes = require("./routes/mailRoutes");
const eventplanner = require("./routes/eventplanner");


// ✅ Nodemailer sender address (uses SMTP config above)
const SENDER_EMAIL = process.env.SMTP_USER?.trim() || "infooccasionsuper@gmail.com";

// Initialize Express
const app = express();

// ✅ CORS Setup
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5000",
  "https://ovevents.onrender.com",
  "https://ocassion-super-5kzj.vercel.app",
  "https://oven-web-frontendd.vercel.app",
  "https://ocassion-super.vercel.app",
  "https://oveventz.com",
  "https://oveventz-frontend.vercel.app", // Production frontend
  "https://oveventz-frontend-git-main-developer01-s-projects.vercel.app",
  "https://oveventz-web.vercel.app", // Preview deployment
  process.env.CLIENT_URL, // optional frontend from .env
  // Allow any Vercel preview deployments
  ...(process.env.CLIENT_URL ? [] : []),
].filter(Boolean);

// Add wildcard support for Vercel preview URLs if needed
if (process.env.NODE_ENV === 'production') {
  // In production, you might want to be more restrictive
  // But for now, we'll allow the specific domains above
}


app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ✅ Configure Helmet to allow cross-origin for static files
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

// ✅ Serve static files from uploads directory with proper CORS
const uploadsPath = path.join(__dirname, "..", "uploads");
const fs = require("fs");

// Verify uploads directory exists
if (!fs.existsSync(uploadsPath)) {
  console.warn("⚠️ Uploads directory not found, creating it:", uploadsPath);
  fs.mkdirSync(uploadsPath, { recursive: true });
}

console.log("📁 Serving static files from:", uploadsPath);
console.log("📁 Absolute path:", path.resolve(uploadsPath));
console.log("📁 Files in uploads:", fs.existsSync(uploadsPath) ? fs.readdirSync(uploadsPath).length : 0);

// Serve static files BEFORE other middleware to ensure proper CORS headers
app.use(
  "/uploads",
  (req, res, next) => {
    // Set CORS headers explicitly
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  },
  express.static(uploadsPath, {
    setHeaders: (res, filePath) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Cache-Control", "public, max-age=31536000");
    },
  })
);

// ✅ Middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));




// ✅ Multer for file uploads
const upload = multer();

// ✅ Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Nodemailer Configuration (trim env values to avoid accidental spaces)
const smtpHost = process.env.SMTP_HOST?.trim();
const smtpPort = parseInt(process.env.SMTP_PORT?.trim() || "587");
const smtpUser = process.env.SMTP_USER?.trim();
const smtpPass = process.env.SMTP_PASS?.trim();

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for other ports
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates (needed for some SMTP servers)
    ciphers: 'SSLv3', // Force SSLv3 for better compatibility
  },
  // Connection pool settings for better reliability
  pool: false, // Disable pool for Render (can cause issues)
  // Increase timeout settings for Render/production
  connectionTimeout: 30000, // 30 seconds (reduced from 60)
  greetingTimeout: 10000, // 10 seconds (reduced from 30)
  socketTimeout: 30000, // 30 seconds (reduced from 60)
  // Additional settings for better reliability
  requireTLS: smtpPort === 587, // Require TLS for port 587
  debug: false, // Set to true for debugging
  logger: false, // Disable logger
});

// Verify email configuration asynchronously (non-blocking)
// Don't block server startup if email verification fails
// Skip verification on Render to avoid timeout issues
if (process.env.NODE_ENV !== 'production' && !process.env.RENDER) {
  setTimeout(() => {
    transporter.verify((error, success) => {
      if (error) {
        console.log("⚠️ Email configuration warning:", error.message);
        console.log("SMTP settings:", {
          host: smtpHost || null,
          port: smtpPort || null,
          user: smtpUser ? smtpUser.replace(/(.{2}).+(@.+)/, "$1****$2") : null,
          passSet: !!smtpPass,
        });
        console.log("⚠️ Email will be tested when first email is sent");
        console.log("💡 Tip: Gmail SMTP may timeout on Render. Consider using SendGrid or Resend for production.");
      } else {
        console.log("✅ Email server is ready");
      }
    });
  }, 2000); // Verify after 2 seconds (non-blocking)
} else {
  console.log("⚠️ Skipping SMTP verification on Render (will test on first email send)");
  console.log("💡 Tip: If emails fail, check:");
  console.log("   1. Gmail App Password is set (not regular password)");
  console.log("   2. 'Less secure app access' is enabled (if using regular password)");
  console.log("   3. Consider using SendGrid/Resend for better reliability");
}

// ✅ Connect MongoDB
connectDB()
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((error) => {
    console.error("❌ Database connection failed:", error.message);
    console.log("⚠️ Server will still start without DB connection");
  });

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.json({
    message: "🎉 OccasionSuper backend is running 🚀",
    status: "active",
    timestamp: new Date().toISOString(),
  });
});

// ✅ Test static file serving
app.get("/test-uploads", (req, res) => {
  const fs = require("fs");
  const uploadsPath = path.join(__dirname, "..", "uploads");
  try {
    const files = fs.readdirSync(uploadsPath);
    res.json({
      success: true,
      uploadsPath,
      fileCount: files.length,
      sampleFiles: files.slice(0, 5),
      message: "Static file serving is configured correctly"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      uploadsPath,
      error: error.message,
      message: "Error reading uploads directory"
    });
  }
});

// ✅ Generic File Upload Endpoint (for blog images, etc.)
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    // Upload to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "blog_images" },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).json({
            success: false,
            message: "Failed to upload image",
            error: error.message
          });
        }

        return res.status(200).json({
          success: true,
          url: result.secure_url,
          public_id: result.public_id
        });
      }
    );

    // Convert buffer to stream and upload
    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Upload failed",
      error: error.message
    });
  }
});

// ✅ API Routes
app.use("/api/register/vendor", vendorRegisterRoute);
app.use("/api", authRoutes);
app.use("/api", vendorProfileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/vendorEmail", mailRoutes);
app.use("/api/eventplan", eventplanner);


// ✅ Verify email setup
console.log("✅ Using Nodemailer for email service");

// ✅ Email for credentials (vendor login / password reset)
 app.post("/api/send-credentials", async (req, res) => {
  try {
    const { email, password, isPasswordReset } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const subject = isPasswordReset
      ? "Your Password Has Been Reset"
      : "Your New Account Credentials";

    const bodyText = isPasswordReset
      ? "<p>Your password for the vendor portal has been successfully reset. Use the temporary password below to log in immediately and change it.</p>"
      : "<p>Welcome to our vendor portal! Here are your initial credentials:</p>";

    const html = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #4f46e5;">${subject}</h2>
        ${bodyText}
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 10px; border: 1px solid #eee; background-color: #f7f7f7;"><strong>Email:</strong></td>
            <td style="padding: 10px; border: 1px solid #eee;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #eee; background-color: #f7f7f7;"><strong>Temporary Password:</strong></td>
            <td style="padding: 10px; border: 1px solid #eee; font-weight: bold; color: #b91c1c;">${password}</td>
          </tr>
        </table>
        <p style="margin-top: 20px;">Please change this temporary password after logging in for security purposes.</p>
        <p>Thank you,<br><strong>OccasionSuper Team</strong></p>
      </div>
    `;

    const mailOptions = {
      from: SENDER_EMAIL,
      to: email,
      subject,
      html,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error(`❌ Email error: ${err.message}`);
        return res.status(500).json({
          success: false,
          message: "Failed to send email.",
          error: err.message,
        });
      }
      console.log(`✅ Credentials email sent to: ${email}`, info.response);
      res.status(200).json({
        success: true,
        message: `Email sent to ${email} successfully.`,
      });
    });
  } catch (error) {
    console.error("❌ Nodemailer Email Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send email.",
      error: error.message,
    });
  }
});

// ✅ Email for rejection messages
app.post("/api/send-msg", async (req, res) => {
  try {
    const { email, msg } = req.body;

    if (!email || !msg) {
      return res.status(400).json({
        success: false,
        message: "Email and message are required.",
      });
    }

    const subject = "Vendor Application Rejection";
    const html = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #b91c1c;">${subject}</h2>
        <p>Dear Vendor,</p>
        <p>We regret to inform you that your vendor application was not approved for the following reason:</p>
        <blockquote style="background-color:#f9f9f9; border-left: 4px solid #b91c1c; padding: 10px; margin: 10px 0;">${msg}</blockquote>
        <p>You may reapply after addressing the feedback provided above.</p>
        <p>Thank you,<br><strong>OccasionSuper Team</strong></p>
      </div>
    `;

    const mailOptions = {
      from: SENDER_EMAIL,
      to: email,
      subject,
      html,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error(`❌ Email error: ${err.message}`);
        return res.status(500).json({
          success: false,
          message: "Failed to send email.",
          error: err.message,
        });
      }
      console.log(`✅ Rejection email sent to: ${email}`, info.response);
      res.status(200).json({
        success: true,
        message: `Email sent to ${email} successfully.`,
      });
    });
  } catch (error) {
    console.error("❌ Nodemailer Email Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send email.",
      error: error.message,
    });
  }
});



// get and post for blog

app.get('/blog', async (req, res) => {
  try {
    const blogs = await blogModel.find();
    res.status(200).json(blogs);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch blogs",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.post('/blog/createBlog', async (req, res) => {
  try {
    const { image, title, para } = req.body;
    
    if (!title || !para) {
      return res.status(400).json({
        success: false,
        message: "Title and paragraph are required"
      });
    }

    const blog = await blogModel.create({
      image,
      title,
      para
    });
    
    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: blog
    });
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create blog",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.put('/blog/update/:id', async (req, res) => {
  try {
    const { image, para, title } = req.body;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Blog ID is required"
      });
    }

    const blog = await blogModel.findOneAndUpdate(
      { _id: id },
      { title, para, image },
      { new: true, runValidators: true }
    );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: blog
    });
  } catch (error) {
    console.error("Error updating blog:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update blog",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.delete('/blog/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Blog ID is required"
      });
    }

    const blog = await blogModel.findOneAndDelete({ _id: id });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
      data: blog
    });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete blog",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Public route to get active reviews (for frontend display)
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await ReviewModel.find({ isActive: true })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

console.log
// ✅ 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl
  });
});

// ✅ Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
