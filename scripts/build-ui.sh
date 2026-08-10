#!/usr/bin/env sh
# Generates FE/js/config.js with the deployed API URL, for the Render static site.
set -eu

host="${API_HOST:-}"
if [ -z "$host" ]; then
  echo "build-ui: API_HOST is not set" >&2
  exit 1
fi

# Render's fromService `host` property yields the bare service name
# (e.g. inventory-api-8v1z) rather than the public hostname. Expand it unless
# it already looks fully qualified, so a custom domain still works.
case "$host" in
  *.*) ;;
  *) host="$host.onrender.com" ;;
esac

printf "window.INVENTORY_API_URL = 'https://%s/api';\n" "$host" > FE/js/config.js
echo "build-ui: API base URL -> https://$host/api"
