let sharp;
let ImageOptimizer;

// Try to import Sharp, but don't fail if it's not available
try {
  sharp = require('sharp');
  const path = require('path');
  const fs = require('fs').promises;

  class ImageOptimizerClass {
    constructor() {
      this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif'];
      this.quality = 80;
      this.maxWidth = 1200;
      this.maxHeight = 1200;
    }

    // Optimize a single image
    async optimizeImage(inputPath, outputPath, options = {}) {
      try {
        const {
          width = this.maxWidth,
          height = this.maxHeight,
          quality = this.quality,
          format = 'webp'
        } = options;

        // Create output directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });

        // Process image with Sharp
        const image = sharp(inputPath);
        
        // Resize image
        image.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        });

        // Convert to specified format and optimize
        switch (format.toLowerCase()) {
          case 'webp':
            image.webp({ quality });
            break;
          case 'avif':
            image.avif({ quality });
            break;
          case 'jpeg':
          case 'jpg':
            image.jpeg({ quality });
            break;
          case 'png':
            image.png({ quality });
            break;
          default:
            image.webp({ quality });
        }

        // Save optimized image
        await image.toFile(outputPath);
        
        return {
          success: true,
          originalSize: await this.getFileSize(inputPath),
          optimizedSize: await this.getFileSize(outputPath),
          compressionRatio: await this.getCompressionRatio(inputPath, outputPath)
        };
      } catch (error) {
        console.error('Image optimization error:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    // Generate multiple sizes for responsive images
    async generateResponsiveImages(inputPath, outputDir, filename) {
      const sizes = [
        { width: 400, height: 400, suffix: 'thumb' },
        { width: 800, height: 800, suffix: 'medium' },
        { width: 1200, height: 1200, suffix: 'large' }
      ];

      const results = [];

      for (const size of sizes) {
        const outputPath = path.join(outputDir, `${filename}-${size.suffix}.webp`);
        const result = await this.optimizeImage(inputPath, outputPath, {
          width: size.width,
          height: size.height,
          format: 'webp'
        });
        
        results.push({
          size: size.suffix,
          path: outputPath,
          ...result
        });
      }

      return results;
    }

    // Create image placeholder
    async createPlaceholder(width, height, color = '#f3f4f6') {
      try {
        const placeholder = sharp({
          create: {
            width,
            height,
            channels: 3,
            background: color
          }
        });

        return await placeholder.webp({ quality: 10 }).toBuffer();
      } catch (error) {
        console.error('Placeholder creation error:', error);
        return null;
      }
    }

    // Generate blur hash for lazy loading
    async generateBlurHash(inputPath) {
      try {
        const image = sharp(inputPath);
        const { width, height } = await image.metadata();
        
        // Resize to small size for blur hash
        const resized = await image
          .resize(32, 32, { fit: 'cover' })
          .raw()
          .toBuffer();

        // Convert to base64 for blur hash
        const base64 = resized.toString('base64');
        
        return {
          width,
          height,
          blurHash: base64
        };
      } catch (error) {
        console.error('Blur hash generation error:', error);
        return null;
      }
    }

    // Get file size in bytes
    async getFileSize(filePath) {
      try {
        const stats = await fs.stat(filePath);
        return stats.size;
      } catch (error) {
        console.error('File size error:', error);
        return 0;
      }
    }

    // Calculate compression ratio
    async getCompressionRatio(originalPath, optimizedPath) {
      try {
        const originalSize = await this.getFileSize(originalPath);
        const optimizedSize = await this.getFileSize(optimizedPath);
        
        if (originalSize === 0) return 0;
        
        return ((originalSize - optimizedSize) / originalSize) * 100;
      } catch (error) {
        console.error('Compression ratio error:', error);
        return 0;
      }
    }

    // Validate image file
    async validateImage(filePath) {
      try {
        const metadata = await sharp(filePath).metadata();
        return {
          valid: true,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: metadata.size
        };
      } catch (error) {
        return {
          valid: false,
          error: error.message
        };
      }
    }

    // Batch optimize images
    async batchOptimize(inputDir, outputDir, options = {}) {
      try {
        const files = await fs.readdir(inputDir);
        const imageFiles = files.filter(file => 
          this.supportedFormats.includes(path.extname(file).toLowerCase().slice(1))
        );

        const results = [];

        for (const file of imageFiles) {
          const inputPath = path.join(inputDir, file);
          const outputPath = path.join(outputDir, `${path.parse(file).name}.webp`);
          
          const result = await this.optimizeImage(inputPath, outputPath, options);
          results.push({
            file,
            ...result
          });
        }

        return results;
      } catch (error) {
        console.error('Batch optimization error:', error);
        return [];
      }
    }

    // Generate srcset for responsive images
    generateSrcSet(imagePath, sizes = [400, 800, 1200]) {
      const baseName = path.parse(imagePath).name;
      const ext = path.extname(imagePath);
      
      return sizes
        .map(size => `${baseName}-${size}w${ext} ${size}w`)
        .join(', ');
    }

    // Generate picture element HTML
    generatePictureElement(imagePath, alt = '') {
      const baseName = path.parse(imagePath).name;
      
      return `
        <picture>
          <source srcset="${baseName}-large.webp" media="(min-width: 1024px)">
          <source srcset="${baseName}-medium.webp" media="(min-width: 768px)">
          <source srcset="${baseName}-thumb.webp" media="(max-width: 767px)">
          <img src="${baseName}-medium.webp" alt="${alt}" loading="lazy">
        </picture>
      `;
    }
  }

  ImageOptimizer = ImageOptimizerClass;
  console.log('✅ Image optimization available');
} catch (error) {
  console.log('⚠️ Sharp not available, image optimization disabled');
  
  // Create a dummy ImageOptimizer class
  class DummyImageOptimizer {
    constructor() {
      this.supportedFormats = [];
    }

    async optimizeImage() {
      return { success: false, error: 'Image optimization not available' };
    }

    async generateResponsiveImages() {
      return [];
    }

    async createPlaceholder() {
      return null;
    }

    async generateBlurHash() {
      return null;
    }

    async validateImage() {
      return { valid: false, error: 'Image validation not available' };
    }

    async batchOptimize() {
      return [];
    }

    generateSrcSet() {
      return '';
    }

    generatePictureElement() {
      return '';
    }
  }

  ImageOptimizer = DummyImageOptimizer;
}

module.exports = ImageOptimizer; 