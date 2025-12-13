import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Gmail setup
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // your-email@gmail.com
        pass: process.env.EMAIL_PASSWORD, // App Password (not Gmail password)
      },
    });
  }

  async sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Coffee Shop Management" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      });
      console.log(`✅ Email sent to: ${to}`);
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  // Template: Store request approved
  async sendStoreApprovedEmail(userEmail: string, userName: string, storeName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Yêu cầu tạo cửa hàng đã được chấp nhận!</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${userName}</strong>,</p>
            
            <p>Chúng tôi vui mừng thông báo rằng yêu cầu tạo cửa hàng của bạn đã được <strong>chấp nhận</strong>!</p>
            
            <p><strong>Thông tin cửa hàng:</strong></p>
            <ul>
              <li>Tên cửa hàng: <strong>${storeName}</strong></li>
              <li>Trạng thái: <span style="color: #4CAF50;">✅ Đã kích hoạt</span></li>
            </ul>
            
            <p>Bạn có thể đăng nhập và bắt đầu quản lý cửa hàng ngay bây giờ:</p>
            
            <a href="${process.env.FRONTEND_URL}/host/login" class="button">Đăng nhập ngay</a>
            
            <p style="margin-top: 30px;">Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
            
            <p>Trân trọng,<br><strong>Coffee Shop Management Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2024 Coffee Shop Management. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: userEmail,
      subject: '🎉 Yêu cầu tạo cửa hàng đã được chấp nhận',
      html,
    });
  }

  // Template: Store request rejected
  async sendStoreRejectedEmail(
    userEmail: string,
    userName: string,
    storeName: string,
    reason: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .reason-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Yêu cầu tạo cửa hàng không được chấp nhận</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${userName}</strong>,</p>
            
            <p>Chúng tôi rất tiếc phải thông báo rằng yêu cầu tạo cửa hàng "<strong>${storeName}</strong>" của bạn không được chấp nhận.</p>
            
            <div class="reason-box">
              <strong>Lý do từ chối:</strong><br>
              ${reason}
            </div>
            
            <p>Bạn có thể gửi lại yêu cầu sau khi đã khắc phục các vấn đề trên.</p>
            
            <a href="${process.env.FRONTEND_URL}/host/store-request" class="button">Gửi yêu cầu mới</a>
            
            <p style="margin-top: 30px;">Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
            
            <p>Trân trọng,<br><strong>Coffee Shop Management Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2024 Coffee Shop Management. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: userEmail,
      subject: '❌ Yêu cầu tạo cửa hàng không được chấp nhận',
      html,
    });
  }
}

export default new EmailService();