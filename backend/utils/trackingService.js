const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Supported shipping carriers with their tracking URL patterns
const SHIPPING_CARRIERS = {
  'fedex': {
    name: 'FedEx',
    trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr={trackingNumber}',
    logo: 'https://www.fedex.com/content/dam/fedex-com/logos/logo.png'
  },
  'ups': {
    name: 'UPS',
    trackingUrl: 'https://www.ups.com/track?tracknum={trackingNumber}',
    logo: 'https://www.ups.com/assets/resources/images/UPS_logo.svg'
  },
  'usps': {
    name: 'USPS',
    trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={trackingNumber}',
    logo: 'https://www.usps.com/assets/images/home/usps-logo-2x.png'
  },
  'dhl': {
    name: 'DHL',
    trackingUrl: 'https://www.dhl.com/en/express/tracking.html?AWB={trackingNumber}',
    logo: 'https://www.dhl.com/content/dam/dhl/global/core/images/logos/dhl-logo.svg'
  },
  'amazon': {
    name: 'Amazon Logistics',
    trackingUrl: 'https://www.amazon.com/gp/help/customer/display.html?nodeId=202162380',
    logo: 'https://www.amazon.com/favicon.ico'
  },
  'ontrac': {
    name: 'OnTrac',
    trackingUrl: 'https://www.ontrac.com/trackingres.asp?tracking_number={trackingNumber}',
    logo: 'https://www.ontrac.com/images/ontrac-logo.png'
  }
};

class TrackingService {
  // Generate tracking URL for a given carrier and tracking number
  static generateTrackingUrl(carrier, trackingNumber) {
    const carrierInfo = SHIPPING_CARRIERS[carrier.toLowerCase()];
    if (!carrierInfo) {
      return null;
    }
    
    return carrierInfo.trackingUrl.replace('{trackingNumber}', trackingNumber);
  }

  // Get carrier information
  static getCarrierInfo(carrier) {
    return SHIPPING_CARRIERS[carrier.toLowerCase()] || null;
  }

  // Get all supported carriers
  static getSupportedCarriers() {
    return Object.keys(SHIPPING_CARRIERS).map(key => ({
      code: key,
      ...SHIPPING_CARRIERS[key]
    }));
  }

  // Update order with tracking information
  static async updateOrderTracking(orderId, trackingData) {
    const { trackingNumber, shippingCarrier, estimatedDelivery } = trackingData;
    
    const trackingUrl = this.generateTrackingUrl(shippingCarrier, trackingNumber);
    
    const updateData = {
      trackingNumber,
      shippingCarrier: shippingCarrier.toLowerCase(),
      trackingUrl,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
      shippedAt: new Date(),
      status: 'SHIPPED'
    };

    try {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true
                }
              }
            }
          }
        }
      });

      return updatedOrder;
    } catch (error) {
      console.error('Error updating order tracking:', error);
      throw error;
    }
  }

  // Mark order as delivered
  static async markOrderDelivered(orderId) {
    try {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return updatedOrder;
    } catch (error) {
      console.error('Error marking order as delivered:', error);
      throw error;
    }
  }

  // Get order tracking information
  static async getOrderTracking(orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          trackingNumber: true,
          shippingCarrier: true,
          trackingUrl: true,
          estimatedDelivery: true,
          shippedAt: true,
          deliveredAt: true,
          createdAt: true,
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true
                }
              }
            }
          }
        }
      });

      if (!order) {
        return null;
      }

      const carrierInfo = order.shippingCarrier ? 
        this.getCarrierInfo(order.shippingCarrier) : null;

      return {
        ...order,
        carrierInfo
      };
    } catch (error) {
      console.error('Error getting order tracking:', error);
      throw error;
    }
  }

  // Validate tracking number format (basic validation)
  static validateTrackingNumber(carrier, trackingNumber) {
    if (!trackingNumber || !carrier) {
      return false;
    }

    const patterns = {
      'fedex': /^\d{12}$|^\d{15}$/,
      'ups': /^1Z[0-9A-Z]{16}$|^[0-9]{9}$|^T[0-9]{10}$/,
      'usps': /^[0-9]{20}$|^[0-9]{22}$|^[A-Z]{2}[0-9]{9}[A-Z]{2}$/,
      'dhl': /^[0-9]{10}$|^[0-9]{11}$|^[0-9]{12}$/,
      'amazon': /^TBA[0-9]{10}$/,
      'ontrac': /^[0-9]{12}$/
    };

    const pattern = patterns[carrier.toLowerCase()];
    return pattern ? pattern.test(trackingNumber) : true; // If no pattern, accept any
  }
}

module.exports = TrackingService; 