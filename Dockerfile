FROM php:8.4-cli

# Install dependencies
RUN apt-get update && apt-get install -y \
    git curl unzip zip libpng-dev libonig-dev libxml2-dev \
    libzip-dev libfreetype6-dev libjpeg62-turbo-dev libwebp-dev \
    libicu-dev libpq-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) gd pdo_mysql pdo_pgsql mbstring exif pcntl bcmath zip intl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

WORKDIR /var/www/html

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Copy composer files and install (NO SCRIPTS first)
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --optimize-autoloader --prefer-dist

# Copy app
COPY . .

# Run composer scripts now that artisan exists
RUN composer dump-autoload --optimize \
    && php artisan package:discover --ansi

# NPM build
RUN npm ci --progress=false && npm run build

# Cleanup
RUN npm prune --production && rm -rf node_modules/.cache /root/.npm

# Set permissions
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwx storage bootstrap/cache

# Expose port
EXPOSE 8080

# Start Laravel (binds to 0.0.0.0:8080 immediately)
CMD php artisan serve --host=0.0.0.0 --port=8080
