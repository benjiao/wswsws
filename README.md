# WSWSWS Cat Shelter Management Software
[![CC BY-SA 4.0][cc-by-sa-shield]][cc-by-sa]

## Development
### Getting started
1. Install Docker
2. Build environment `docker compose build`
3. Run environment `docker compose up`

### Other Notes
#### Install `node_modules` for VSCode
If you're using VSCode, you'll need to install `node_modules` on the host machine. This is because the VSCode plugin needs access to the packages for error checking in the editor.

1. Install npm. 
2. Install yarn. `npm install -g yarn`
3. Run yarn. `cd web && yarn install`

### Backups
Run this through the Portainer console:
```
python manage.py dumpdata patients inventory treatments \
  --exclude auth.permission \
  --exclude contenttypes \
  --exclude sessions \
  --exclude admin \
  --output /mnt/backups/wswsws_$(date +%Y%m%d_%H%M%S).json
```

Load database dump: 
```
 docker compose exec api python manage.py loaddata data/wswsws_20260117_173806.json
```

### Deployment

```
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag registry.benjiao.net/wswsws/web:latest \
  --push web/

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t registry.benjiao.net/wswsws/api:latest \
  --push api/
```

## How does it work?

## License
This work is licensed under a
[Creative Commons Attribution-ShareAlike 4.0 International License][cc-by-sa].

[![CC BY-SA 4.0][cc-by-sa-image]][cc-by-sa]

[cc-by-sa]: http://creativecommons.org/licenses/by-sa/4.0/
[cc-by-sa-image]: https://licensebuttons.net/l/by-sa/4.0/88x31.png
[cc-by-sa-shield]: https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg