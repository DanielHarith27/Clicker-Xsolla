# Deployment Guide

Complete setup instructions for deploying the Clicker game to production.

## Deployment Checklist

- [ ] Configure environment variables
- [ ] Set up PostgreSQL database
- [ ] Obtain Xsolla credentials
- [ ] Set up SSL/HTTPS
- [ ] Configure domain name
- [ ] Deploy code
- [ ] Test payment system
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Go live

## Pre-Deployment Setup

### 1. Prepare Production Environment Variables

Create a `.env.production` file:

```env
# Server
PORT=443
NODE_ENV=production

# Database
DB_HOST=prod-db.example.com
DB_PORT=5432
DB_NAME=clicker_game_prod
DB_USER=game_user
DB_PASSWORD=strong_password_here

# JWT
JWT_SECRET=use_a_very_strong_random_secret_at_least_32_chars

# Xsolla (Real Account)
XSOLLA_MERCHANT_ID=your_real_merchant_id
XSOLLA_API_KEY=your_real_api_key
XSOLLA_PROJECT_ID=your_real_project_id
```

### 2. Set Up PostgreSQL Database

For production PostgreSQL:

```bash
# Create dedicated user
createuser -P game_user

# Create database
createdb -O game_user clicker_game_prod

# Import schema
psql -U game_user -d clicker_game_prod < database.sql

# Set up regular backups
pg_dump -U game_user clicker_game_prod > backup_$(date +%Y%m%d).sql
```

### 3. Configure SSL/HTTPS

Get an SSL certificate (free options):

**Option A: Let's Encrypt (Recommended)**
```bash
# Using Certbot
sudo certbot certonly --standalone -d yourdomain.com
```

**Option B: Purchase from provider**
- Namecheap
- GoDaddy
- DigiCert

## Deployment Options

### Option 1: Heroku (Easiest)

**Pros:** One-click deploy, automatic scaling, easy PostgreSQL setup
**Cost:** Free tier available, paid plans start at $7/month

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-game-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret_here
heroku config:set XSOLLA_MERCHANT_ID=your_id
# ... set other variables

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

**Heroku Procfile** (create in root directory):
```
web: node server.js
```

### Option 2: AWS (DigitalOcean, Linode - Similar Steps)

**Pros:** Full control, scalable, reliable
**Cost:** $5-20+ per month

```bash
# 1. Create Droplet (Ubuntu 20.04)
# 2. SSH into server
ssh root@your.ip.address

# 3. Install dependencies
sudo apt update
sudo apt install -y nodejs npm postgresql postgresql-contrib nginx

# 4. Clone repository
git clone https://github.com/yourusername/clicker-game.git
cd clicker-game

# 5. Install Node dependencies
npm install --production

# 6. Set up PostgreSQL
sudo -u postgres psql < database.sql

# 7. Configure environment
sudo nano .env

# 8. Start with PM2 (process manager)
sudo npm install -g pm2
pm2 start server.js
pm2 startup
pm2 save

# 9. Configure Nginx (reverse proxy)
# See Nginx configuration below
```

**Nginx Configuration** (`/etc/nginx/sites-available/default`):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable SSL:
```bash
# Install Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renew
sudo systemctl enable certbot.timer
```

### Option 3: Railway.app

**Pros:** Simple deployment, free tier available
**Cost:** Pay-as-you-go, ~$5-10/month

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up

# Set environment variables in dashboard
# View logs in dashboard
```

### Option 4: Render

**Pros:** Git-based deployment, easy configuration
**Cost:** Free tier available, paid starts at $7/month

1. Push code to GitHub
2. Create new "Web Service" on render.com
3. Connect GitHub repository
4. Configure environment variables
5. Auto-deploys on git push

## Post-Deployment Tasks

### 1. Set Up Monitoring

**Option A: Sentry (Error Tracking)**
```javascript
// Add to server.js
const Sentry = require("@sentry/node");
Sentry.init({ dsn: "YOUR_SENTRY_DSN" });
app.use(Sentry.Handlers.errorHandler());
```

**Option B: LogRocket (User Session Recording)**
- Sign up at logrocket.com
- Add script to index.html

### 2. Database Backups

**Automated backups script:**

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -U game_user clicker_game_prod > $BACKUP_DIR/backup_$TIMESTAMP.sql
gzip $BACKUP_DIR/backup_$TIMESTAMP.sql

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

Add to crontab:
```bash
0 2 * * * /path/to/backup.sh
```

### 3. Set Up CDN (Optional)

For static files (CSS, JS):

**Cloudflare (Free)**
1. Add DNS to Cloudflare
2. Enable caching
3. Automatic SSL

### 4. Performance Optimization

Add to server.js:
```javascript
// Compression
const compression = require('compression');
app.use(compression());

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Helmet for security headers
const helmet = require('helmet');
app.use(helmet());
```

## Testing in Production

### 1. Test Payment System

```bash
# Use sandbox mode first
# Then switch to production with test cards

# Test card for success:
4111 1111 1111 1111

# Test card for decline:
4000 0000 0000 0002
```

### 2. Load Testing

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Run load test
ab -n 1000 -c 10 https://yourdomain.com

# Or use wrk
wrk -t12 -c400 -d30s https://yourdomain.com
```

### 3. Security Testing

- Run OWASP ZAP scan
- Test SQL injection attempts
- Verify HTTPS works
- Check security headers

## Troubleshooting Production Issues

### Issue: Database Connection Fails
```bash
# Check if PostgreSQL is running
systemctl status postgresql

# Check connection
psql -U game_user -d clicker_game_prod -h localhost

# Check firewall
sudo ufw status
sudo ufw allow 5432/tcp
```

### Issue: Server Memory Leak
```bash
# Monitor memory
free -h

# Check Node process
ps aux | grep node

# Restart if needed
pm2 restart all
```

### Issue: Payment Widget Not Loading
1. Check Xsolla credentials
2. Verify HTTPS is working
3. Check browser console for CORS errors
4. Test in sandbox mode first

### Issue: Slow Database Queries
```sql
-- Add indexes if missing
CREATE INDEX idx_user_upgrades_user_id ON user_upgrades(user_id);
CREATE INDEX idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX idx_game_state_user_id ON game_state(user_id);

-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC;
```

## Scaling Checklist

If game gets popular:

- [ ] Add database read replicas
- [ ] Implement Redis caching
- [ ] Use CDN for static assets
- [ ] Load balance multiple app servers
- [ ] Set up database connection pooling
- [ ] Monitor and optimize database queries
- [ ] Implement auto-scaling policies

## Maintenance

### Weekly
- Check error logs
- Monitor server health
- Review payment transactions

### Monthly
- Database optimization
- Update dependencies
- Review security logs
- Backup verification

### Quarterly
- Major updates
- Performance optimization
- Security audit
- Feature releases

## Rollback Procedure

If something goes wrong:

```bash
# For Heroku
heroku releases
heroku rollback v# # Replace # with version number

# For DigitalOcean/AWS
git revert <commit-hash>
git push
pm2 restart all

# Database rollback
# Restore from backup
pg_dump -U game_user clicker_game_prod | psql -U game_user -d clicker_game_prod < backup_YYYYMMDD.sql
```

## Support Contacts

- **Xsolla**: support@xsolla.com or https://developers.xsolla.com/
- **PostgreSQL**: PostgreSQL Forums
- **Node.js**: Stack Overflow with [node.js] tag
- **Your hosting provider**: Check their support portal

---

**Last Updated:** April 21, 2026
**Version:** 1.0.0
