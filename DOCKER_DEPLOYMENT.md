# Docker deployment scripts for Crew Scheduler

## Quick Start

### 1. Build and Run Locally
```bash
# Build the Docker image
docker build -t crew-scraper .

# Run the container
docker run -p 3000:3000 crew-scraper
```

### 2. Using Docker Compose (Recommended)
```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### 3. Access the Application
- Web Interface: http://localhost:3000
- Health Check: http://localhost:3000/health
- API Endpoint: http://localhost:3000/api/scrape

## Production Deployment

### Deploy to VPS/Cloud Server
```bash
# Copy files to server
scp -r . user@your-server:/path/to/crew-scheduler/

# SSH into server
ssh user@your-server

# Navigate to project
cd /path/to/crew-scheduler/

# Start with Docker Compose
docker-compose up -d

# Check status
docker-compose ps
```

### Environment Configuration
Create a `.env` file for production settings:
```bash
NODE_ENV=production
PORT=3000
```

## Maintenance Commands

### View Logs
```bash
docker-compose logs -f crew-scraper
```

### Update Application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up --build -d
```

### Backup Data
```bash
docker-compose exec crew-scraper tar -czf /tmp/backup.tar.gz /app/data
docker cp $(docker-compose ps -q crew-scraper):/tmp/backup.tar.gz ./backup-$(date +%Y%m%d).tar.gz
```

## Troubleshooting

### Common Issues
1. **Port already in use**: Change port in docker-compose.yml
2. **Out of memory**: Increase Docker memory limits
3. **Chrome crashes**: Check /dev/shm mount and memory allocation

### Debug Mode
```bash
# Run in debug mode
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up
```