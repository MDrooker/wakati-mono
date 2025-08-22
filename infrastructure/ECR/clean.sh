echo "cleaning and upgrading"
rm -rf package-lock.json
rm -rf node_modules
npx npm-upgrade 
pnpm install -force --no-frozen-lockfile
