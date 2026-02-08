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
    nginx supervisor \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 (properly)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

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
# Copy composer files and install dependencies (NO SCRIPTS - artisan not present yet)
# ----------------------------
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --optimize-autoloader --prefer-dist

# ----------------------------
# Copy the rest of the app (includes artisan)
# ----------------------------
COPY . .

# ----------------------------
# Run composer scripts NOW (artisan is available)
# ----------------------------
RUN composer dump-autoload --optimize \
    && php artisan package:discover --ansi

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
# Skip cache during build (no env vars available) - do at runtime
# ----------------------------

# ----------------------------
# Nginx config (for production)
# ----------------------------
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 8080;
    server_name _;
    root /var/www/html/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\. {
        deny all;
    }
}
EOF

# ----------------------------
# Supervisor config (Nginx + PHP-FPM)
# ----------------------------
COPY <<EOF /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root

[program:php-fpm]
command=php-fpm -F
autostart=true
autorestart=true

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
EOF

# ----------------------------
# Expose port
# ----------------------------
EXPOSE 8080

# ----------------------------
# Start services (migrations run at runtime with env vars)
# ----------------------------
CMD php artisan migrate --force && /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
