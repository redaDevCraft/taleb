FROM php:8.4-fpm

# Install system dependencies (GD deps FIRST)
RUN apt-get update && apt-get install -y \
    git curl libpng-dev libonig-dev libxml2-dev libzip-dev \
    libfreetype6-dev libjpeg62-turbo-dev libwebp-dev libxpm-dev \
    zip unzip nginx supervisor gnupg \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Configure & install GD + extensions
RUN docker-php-ext-configure gd \
    --with-freetype \
    --with-jpeg \
    --with-webp \
    --with-xpm \
    && docker-php-ext-install -j$(nproc) \
    gd \
    pdo_mysql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    zip

# Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

WORKDIR /var/www/html

# Composer install
RUN curl -sS https://getcomposer.org/installer | php -- \
    --install-dir=/usr/local/bin --filename=composer

# Composer LOCKED layer (cache)
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-scripts \
    --optimize-autoloader \
    --prefer-dist \
    --no-interaction

# Copy source
COPY . .

# Final composer
RUN composer dump-autoload --optimize \
    && composer run-script post-autoload-dump --no-dev --no-interaction

# NPM: FULL install for Vite/Wayfinder (dev deps required)
RUN npm ci --include=dev --no-audit --progress=false

# Wayfinder: Generate BEFORE vite build
RUN php artisan wayfinder:generate --force

# Vite build
RUN npm run build

# NPM: Prod-only FINAL install (remove dev)
RUN npm ci --omit=dev --no-audit --progress=false

# Deep cleanup
RUN rm -rf \
    node_modules/.vite \
    node_modules/.cache \
    /root/.npm \
    /tmp/* \
    /var/cache/apk/*

# Laravel: Production cache
RUN php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache \
    && php artisan optimize

# Permissions (strict)
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R ug+rwx /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod 775 /var/www/html/storage/logs/laravel.log

# Nginx: Laravel optimized
COPY <<'NGINX_EOF' /etc/nginx/conf.d/default.conf
server {
    listen ${PORT:-8080};
    server_name _;
    root /var/www/html/public;
    index index.php;

    # Security
    server_tokens off;
    client_max_body_size 100M;

    # Static gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param HTTPS on;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
        include fastcgi_params;
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Block hidden
    location ~ /\. {
        deny all;
    }
}
NGINX_EOF

# Supervisor: Production logging
COPY <<'SUPERVISOR_EOF' /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisord/supervisord.log
pidfile=/var/run/supervisord.pid

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
stderr_logfile=/var/log/nginx/error.log
stdout_logfile=/var/log/nginx/access.log
stdout_logfile_maxbytes=50MB
stderr_logfile_maxbytes=50MB

[program:php-fpm]
command=php-fpm8.4 --fpm-config /usr/local/etc/php-fpm.conf -F
process_name=%(program_name)s_%(process_num)02d
numprocs=4
autostart=true
autorestart=true
stderr_logfile=/var/log/php-fpm/error.log
stdout_logfile=/var/log/php-fpm/access.log
stdout_logfile_maxbytes=50MB
stderr_logfile_maxbytes=50MB
SUPERVISOR_EOF

# Create log dirs
RUN mkdir -p /var/log/nginx /var/log/php-fpm /var/log/supervisord \
    && chown www-data:www-data /var/log/nginx /var/log/php-fpm

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

EXPOSE ${PORT:-8080}

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
