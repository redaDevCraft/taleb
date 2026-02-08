FROM php:8.4-fpm

# Install deps
RUN apt-get update && apt-get install -y \
    git unzip curl libonig-dev libpng-dev libzip-dev nginx supervisor \
    && docker-php-ext-install pdo_mysql mbstring zip exif pcntl bcmath gd

# Node for assets
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

WORKDIR /var/www/html

# Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Copy & install PHP
COPY . .
RUN composer install --no-dev --optimize-autoloader --no-scripts

# Copy composer scripts if needed, then run
COPY composer.* ./
RUN composer dump-autoload --optimize

# Node assets
RUN npm ci && npm run build

# Laravel optimize
RUN php artisan config:cache && php artisan route:cache && php artisan view:cache

# Nginx config
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    index index.php index.html;
    error_log /var/log/nginx/error.log;
    access_log /var/log/nginx/access.log;
    root /var/www/html/public;
    location ~ \.php$ {
        try_files \$uri =404;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        fastcgi_param PATH_INFO \$fastcgi_path_info;
    }
    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
        gzip_static on;
    }
}
EOF

# Permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage /var/www/html/bootstrap/cache

# Supervisor to run Nginx + PHP-FPM
COPY <<EOF /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true

[program:php-fpm]
command=php-fpm -F
autostart=true
autorestart=true
EOF

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
