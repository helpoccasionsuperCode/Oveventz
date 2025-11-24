const transporter = require("../utils/mailer");
const User = require("../models/user");

const sendEmail = async (req, res) => {
    const {email, password, businessName, ownerName} = req.body;
    
    console.log('📧 Email send request received:', {
        to: email,
        businessName: businessName || 'N/A',
        ownerName: ownerName || 'N/A',
        environment: process.env.NODE_ENV || 'development'
    });

    if(!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required",
            error: "Email and password are required"
        });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists (should be created via admin panel first)
    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User account not found",
            error: "Please create user account first via admin panel before sending email"
        });
    }

    // Update password if provided (for existing user)
    if (password && password.trim()) {
        user.password = password.trim(); // Will be hashed by pre-save hook
        await user.save();
        console.log('✅ [Email] User password updated:', {
            email: normalizedEmail,
            user_id: user._id
        });
    }

    // Validate SMTP configuration before attempting to send
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
    const smtpHost = process.env.SMTP_HOST?.trim();
    
    if (!smtpUser || !smtpPass || !smtpHost) {
        console.error("❌ SMTP Configuration Missing:", {
            SMTP_USER: !!smtpUser,
            SMTP_PASS: !!smtpPass,
            SMTP_HOST: !!smtpHost
        });
        return res.status(500).json({
            success: false,
            message: "Email service is not configured. Please contact administrator.",
            error: "SMTP credentials are missing in production environment. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables."
        });
    }

    try{
        const fromEmail = smtpUser;
        console.log('📤 Attempting to send email...', {
            from: fromEmail,
            to: email,
            subject: "Welcome to oveventz - Your Account Credentials"
        });

        const info = await transporter.sendMail({
            from: `"oveventz Support" <${fromEmail}>`,
            to: email,
            subject: "Welcome to oveventz - Your Account Credentials",
            html: `
              <!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to oveventz</title>
                <style>
                  * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                  }
                  
                  body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f8f9fa;
                  }
                  
                  .email-container {
                    max-width: 650px;
                    margin: 20px auto;
                    background: #ffffff;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e9ecef;
                  }
                  
                  .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 50px 40px;
                    text-align: center;
                    color: white;
                    position: relative;
                  }
                  
                  .header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.05"/><circle cx="50" cy="10" r="1" fill="white" opacity="0.08"/><circle cx="10" cy="90" r="1" fill="white" opacity="0.03"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
                  }
                  
                  .logo {
                    width: 140px;
                    height: auto;
                    margin-bottom: 25px;
                    border-radius: 12px;
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
                    z-index: 1;
                    position: relative;
                  }
                  
                  .header h1 {
                    font-size: 32px;
                    font-weight: 700;
                    margin-bottom: 15px;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    z-index: 1;
                    position: relative;
                  }
                  
                  .header p {
                    font-size: 18px;
                    opacity: 0.95;
                    font-weight: 300;
                    z-index: 1;
                    position: relative;
                  }
                  
                  .content {
                    padding: 50px 40px;
                  }
                  
                  .personalized-greeting {
                    background: linear-gradient(135deg, #f8f9ff 0%, #e3f2fd 100%);
                    border-left: 5px solid #667eea;
                    padding: 25px;
                    margin-bottom: 30px;
                    border-radius: 0 12px 12px 0;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);
                  }
                  
                  .greeting-text {
                    font-size: 20px;
                    color: #2c3e50;
                    font-weight: 600;
                    margin-bottom: 8px;
                  }
                  
                  .business-info {
                    font-size: 16px;
                    color: #666;
                    font-style: italic;
                  }
                  
                  .welcome-text {
                    font-size: 18px;
                    color: #2c3e50;
                    margin-bottom: 25px;
                    text-align: center;
                  }
                  
                  .message {
                    font-size: 16px;
                    color: #555;
                    margin-bottom: 35px;
                    line-height: 1.8;
                  }
                  
                  .credentials-box {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 16px;
                    padding: 35px 30px;
                    margin: 30px 0;
                    color: white;
                    text-align: center;
                    box-shadow: 0 15px 35px rgba(102, 126, 234, 0.3);
                    position: relative;
                    overflow: hidden;
                  }
                  
                  .credentials-box::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                    animation: shimmer 3s ease-in-out infinite;
                  }
                  
                  @keyframes shimmer {
                    0%, 100% { transform: translateX(-50%) translateY(-50%) rotate(0deg); }
                    50% { transform: translateX(-50%) translateY(-50%) rotate(180deg); }
                  }
                  
                  .credentials-title {
                    font-size: 22px;
                    font-weight: 700;
                    margin-bottom: 25px;
                    z-index: 1;
                    position: relative;
                  }
                  
                  .credential-item {
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(10px);
                    border-radius: 12px;
                    padding: 20px;
                    margin: 15px 0;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    z-index: 1;
                    position: relative;
                    transition: transform 0.3s ease;
                  }
                  
                  .credential-item:hover {
                    transform: translateY(-2px);
                  }
                  
                  .credential-label {
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 1.2px;
                    opacity: 0.9;
                    margin-bottom: 8px;
                    font-weight: 500;
                  }
                  
                  .credential-value {
                    font-size: 18px;
                    font-weight: 600;
                    word-break: break-all;
                    font-family: 'Courier New', monospace;
                  }
                  
                  .cta-container {
                    text-align: center;
                    margin: 35px 0;
                  }
                  
                  .cta-button {
                    display: inline-block;
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                    color: white;
                    padding: 18px 40px;
                    text-decoration: none;
                    border-radius: 50px;
                    font-weight: 600;
                    font-size: 16px;
                    margin: 20px 0;
                    transition: all 0.3s ease;
                    box-shadow: 0 8px 25px rgba(79, 172, 254, 0.4);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                  }
                  
                  .cta-button:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 12px 35px rgba(79, 172, 254, 0.6);
                  }
                  
                  .security-note {
                    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
                    border: 2px solid #f39c12;
                    border-radius: 12px;
                    padding: 25px;
                    margin: 30px 0;
                    color: #856404;
                    box-shadow: 0 4px 15px rgba(243, 156, 18, 0.2);
                  }
                  
                  .security-icon {
                    font-size: 22px;
                    margin-right: 12px;
                  }
                  
                  .footer {
                    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                    color: white;
                    padding: 40px;
                    text-align: center;
                  }
                  
                  .company-info {
                    font-size: 16px;
                    margin-bottom: 20px;
                    font-weight: 600;
                  }
                  
                  .contact-info {
                    font-size: 14px;
                    opacity: 0.9;
                    line-height: 1.8;
                  }
                  
                  .divider {
                    height: 6px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0;
                    border: none;
                  }
                  
                  @media (max-width: 650px) {
                    .email-container {
                      margin: 10px;
                      border-radius: 12px;
                    }
                    
                    .header, .content, .footer {
                      padding: 30px 25px;
                    }
                    
                    .header h1 {
                      font-size: 26px;
                    }
                    
                    .credentials-box {
                      padding: 25px 20px;
                    }
                    
                    .personalized-greeting {
                      padding: 20px;
                    }
                  }
                </style>
              </head>
              <body>
                <div class="email-container">
                  <!-- Header with Logo -->
                  <div class="header">
                    <img src="https://via.placeholder.com/140x70/ffffff/667eea?text=oveventz" alt="oveventz Logo" class="logo">
                    <h1>Welcome to oveventz!</h1>
                    <p>Your trusted partner for extraordinary occasions</p>
                  </div>
                  
                  <hr class="divider">
                  
                  <!-- Main Content -->
                  <div class="content">
                    ${ownerName || businessName ? `
                    <div class="personalized-greeting">
                      <div class="greeting-text">
                        Hello ${ownerName ? ownerName : 'there'}! 👋
                      </div>
                      ${businessName ? `<div class="business-info">from ${businessName}</div>` : ''}
                    </div>
                    ` : ''}
                    
                    <div class="welcome-text">
                      🎉 Thank you for reaching out to us!
                    </div>
                    
                    <div class="message">
                      Thank you for contacting <strong>oveventz.com</strong> (ORBOSIS VIBEZ EVENT & MARKETING PRIVATE LIMITED)! 
                      We're thrilled about your interest and are excited to partner with you. We've created your 
                      personalized account to get you started on this amazing journey with us.
                    </div>
                    
                    <!-- Credentials Box -->
                    <div class="credentials-box">
                      <div class="credentials-title">🔐 Your Exclusive Account Access</div>
                      
                      <div class="credential-item">
                        <div class="credential-label">Login Email</div>
                        <div class="credential-value">${email}</div>
                      </div>
                      
                      <div class="credential-item">
                        <div class="credential-label">Secure Password</div>
                        <div class="credential-value">${password}</div>
                      </div>
                    </div>
                    
                    <!-- Call to Action -->
                    <div class="cta-container">
                      <a href="https://oveventz.com/vendor-auth" class="cta-button" target="_blank">
                        🚀 Access Your Dashboard
                      </a>
                    </div>
                    
                    <!-- Security Note -->
                    <div class="security-note">
                      <span class="security-icon">🛡️</span>
                      <strong>Security Reminder:</strong> Please store these credentials securely and consider 
                      updating your password after your first login. Your account security is our top priority.
                    </div>
                    
                    <div class="message">
                      Our dedicated support team is here to guide you every step of the way. Don't hesitate to reach out 
                      with any questions or if you need assistance getting started. We're committed to making every occasion 
                      you create absolutely unforgettable! ✨
                    </div>
                  </div>
                  
                  <!-- Footer -->
                  <div class="footer">
                    <div class="company-info">
                      <strong>ORBOSIS VIBEZ EVENT & MARKETING PRIVATE LIMITED</strong><br>
                      oveventz.com - Creating Memorable Moments
                    </div>
                    
                    <div class="contact-info">
                      📧 support@oveventz.com | 📞 +91 9870823328<br>
                      💼 Business Hours: Mon-Sat 9AM-7PM IST<br>
                      🌟 Making every occasion extraordinary!
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `,
          });

        console.log('✅ Email sent successfully!', {
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected
        });

        res.json({
            success: true,
            message: "Email sent successfully",
            messageId: info.messageId
        });
    } catch (error) {
        console.error("❌ Error sending email:", error);
        console.error("❌ Error details:", {
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode,
            errno: error.errno,
            syscall: error.syscall,
            hostname: error.hostname,
            port: error.port
        });

        // Provide more helpful error messages
        let errorMessage = "Failed to send email";
        let errorDetails = error.message || "Unknown error occurred";

        if (error.message && error.message.includes("SMTP not configured")) {
            errorMessage = "Email service is not configured";
            errorDetails = "SMTP credentials are missing. Please set SMTP environment variables in production.";
        } else if (error.code === "EAUTH") {
            errorMessage = "SMTP authentication failed";
            errorDetails = "Invalid SMTP credentials. Please check SMTP_USER and SMTP_PASS.";
        } else if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
            errorMessage = "SMTP connection failed";
            errorDetails = "Could not connect to SMTP server. Please check SMTP_HOST and SMTP_PORT, and ensure the server is accessible.";
        } else if (error.code === "EENVELOPE") {
            errorMessage = "Invalid email address";
            errorDetails = "The recipient email address is invalid.";
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: errorDetails,
            // Include error code in development for debugging
            ...(process.env.NODE_ENV === 'development' && {
                errorCode: error.code,
                fullError: error.toString()
            })
        });
    }
}

module.exports = { sendEmail };