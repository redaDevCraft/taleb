# ----------------------------
# Base PHP 8.4 image
# ----------------------------
FROM php:8.4-fpm

# ----------------------------
# Install system dependencies
# ----------------------------
RUN apt-get update && apt-get install -y \
    git curl unzip zip libpng-dev libonig-dev libxml2-dev \
    libzip-dev libfreetype6-dev libjpeg62-turbo-dev libwebp-dev \
    nodejs npm \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ----------------------------
# Install PHP extensions
# ----------------------------
RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) gd pdo_mysql mbstring exif pcntl bcmath zip

# ----------------------------
# Set working directory
# ----------------------------
WORKDIR /var/www/html

# ----------------------------
# Install Composer
# ----------------------------
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# ----------------------------
# Copy composer files and install dependencies
# ----------------------------
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --prefer-dist

# ----------------------------
# Copy the rest of the app
# ----------------------------
COPY . .

# ----------------------------
# Generate optimized autoload
# ----------------------------
RUN composer dump-autoload --optimize

# ----------------------------
# Install Node dependencies and build Vite assets
# ----------------------------
RUN npm ci --progress=false && npm run build
RUN npm prune --production && rm -rf node_modules/.cache /root/.npm

# ----------------------------
# Set Laravel permissions
# ----------------------------
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwx storage bootstrap/cache

# ----------------------------
# Laravel optimize
# ----------------------------
RUN php artisan config:clear \
    && php artisan route:clear \
    && php artisan view:clear \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

# ----------------------------
# Expose port
# ----------------------------
EXPOSE 8080

# ----------------------------
# Run migrations and start Laravel
# ----------------------------
CMD php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=8080
