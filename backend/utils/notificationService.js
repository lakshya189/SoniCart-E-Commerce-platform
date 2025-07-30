const prisma = require('./prisma');
const { sendMail } = require('./mail');

class NotificationService {
  // Create a notification for a user
  static async createNotification(userId, type, title, message, data = null) {
    try {
      // Check user's notification preferences
      const preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      if (!preferences) {
        // Create default preferences if none exist
        await prisma.notificationPreference.create({
          data: { userId },
        });
      }

      // Create the notification
      const notification = await prisma.userNotification.create({
        data: {
          userId,
          type,
          title,
          message,
          data,
        },
      });

      // Send email if enabled and appropriate
      if (preferences?.emailNotifications && this.shouldSendEmail(type, preferences)) {
        await this.sendEmailNotification(userId, title, message, type);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Send email notification
  static async sendEmailNotification(userId, title, message, type) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (!user?.email) return;

      const emailContent = this.generateEmailContent(title, message, type, user);
      
      await sendMail({
        to: user.email,
        subject: title,
        html: emailContent,
      });

      // Mark notification as email sent
      await prisma.userNotification.updateMany({
        where: {
          userId,
          type,
          title,
          message,
          isEmail: false,
        },
        data: { isEmail: true },
      });
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  // Generate email content based on notification type
  static generateEmailContent(title, message, type, user) {
    const userName = user.firstName || user.email.split('@')[0];
    
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SoniCart</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>${message}</p>
            <p style="margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">
                Visit SoniCart
              </a>
            </p>
          </div>
          <div class="footer">
            <p>This email was sent from SoniCart. You can manage your notification preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return baseTemplate;
  }

  // Check if email should be sent based on user preferences
  static shouldSendEmail(type, preferences) {
    switch (type) {
      case 'ORDER_UPDATE':
        return preferences.orderUpdates;
      case 'PRICE_DROP_ALERT':
        return preferences.priceDrops;
      case 'NEW_ARRIVAL_ALERT':
        return preferences.newArrivals;
      case 'LOW_STOCK_ALERT':
      case 'OUT_OF_STOCK_ALERT':
      case 'BACK_IN_STOCK_ALERT':
        return preferences.stockAlerts;
      case 'MARKETING_EMAIL':
        return preferences.marketingEmails;
      case 'TEST_NOTIFICATION':
        return preferences.emailNotifications; // Test notifications follow general email preference
      default:
        return true;
    }
  }

  // Create stock-related notifications
  static async createStockNotification(userId, productId, type, message) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { name: true, price: true },
      });

      const title = this.getStockNotificationTitle(type, product?.name);
      
      await this.createNotification(userId, type, title, message, {
        productId,
        productName: product?.name,
        productPrice: product?.price,
      });
    } catch (error) {
      console.error('Error creating stock notification:', error);
    }
  }

  // Get stock notification title
  static getStockNotificationTitle(type, productName) {
    switch (type) {
      case 'LOW_STOCK_ALERT':
        return `Low Stock Alert: ${productName}`;
      case 'OUT_OF_STOCK_ALERT':
        return `Out of Stock: ${productName}`;
      case 'BACK_IN_STOCK_ALERT':
        return `Back in Stock: ${productName}`;
      default:
        return 'Stock Update';
    }
  }

  // Create order update notification
  static async createOrderNotification(userId, orderId, status, message) {
    try {
      const title = `Order Update - ${status.toUpperCase()}`;
      
      await this.createNotification(userId, 'ORDER_UPDATE', title, message, {
        orderId,
        status,
      });
    } catch (error) {
      console.error('Error creating order notification:', error);
    }
  }

  // Create price drop notification
  static async createPriceDropNotification(userId, productId, oldPrice, newPrice) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { name: true },
      });

      const discount = ((oldPrice - newPrice) / oldPrice * 100).toFixed(1);
      const title = `Price Drop Alert: ${product?.name}`;
      const message = `Great news! The price of ${product?.name} has dropped from $${oldPrice} to $${newPrice} (${discount}% off).`;

      await this.createNotification(userId, 'PRICE_DROP_ALERT', title, message, {
        productId,
        productName: product?.name,
        oldPrice,
        newPrice,
        discount,
      });
    } catch (error) {
      console.error('Error creating price drop notification:', error);
    }
  }

  // Create new arrival notification
  static async createNewArrivalNotification(userId, productId) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { name: true, price: true, category: { select: { name: true } } },
      });

      const title = `New Arrival: ${product?.name}`;
      const message = `A new ${product?.category?.name} product has arrived: ${product?.name} for $${product?.price}.`;

      await this.createNotification(userId, 'NEW_ARRIVAL_ALERT', title, message, {
        productId,
        productName: product?.name,
        productPrice: product?.price,
        categoryName: product?.category?.name,
      });
    } catch (error) {
      console.error('Error creating new arrival notification:', error);
    }
  }

  // Bulk create notifications for multiple users
  static async createBulkNotifications(userIds, type, title, message, data = null) {
    try {
      const notifications = [];
      
      for (const userId of userIds) {
        try {
          const notification = await this.createNotification(userId, type, title, message, data);
          notifications.push(notification);
        } catch (error) {
          console.error(`Error creating notification for user ${userId}:`, error);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // Get users who should receive notifications for a specific type
  static async getUsersForNotification(type) {
    try {
      const users = await prisma.user.findMany({
        where: {
          notificationPreferences: {
            [this.getPreferenceField(type)]: true,
          },
        },
        select: { id: true },
      });

      return users.map(user => user.id);
    } catch (error) {
      console.error('Error getting users for notification:', error);
      return [];
    }
  }

  // Get preference field name based on notification type
  static getPreferenceField(type) {
    switch (type) {
      case 'ORDER_UPDATE':
        return 'orderUpdates';
      case 'PRICE_DROP_ALERT':
        return 'priceDrops';
      case 'NEW_ARRIVAL_ALERT':
        return 'newArrivals';
      case 'LOW_STOCK_ALERT':
      case 'OUT_OF_STOCK_ALERT':
      case 'BACK_IN_STOCK_ALERT':
        return 'stockAlerts';
      case 'MARKETING_EMAIL':
        return 'marketingEmails';
      default:
        return 'emailNotifications';
    }
  }
}

module.exports = NotificationService; 