#!/usr/bin/env sh
# Generates FE/js/config.js with the deployed API URL, and version-stamps every
# asset reference so browsers cannot mix a stale script with fresh HTML.
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

# Unique per deploy. RENDER_GIT_COMMIT is set by Render; fall back to a timestamp.
version="${RENDER_GIT_COMMIT:-$(date +%s)}"

cat > FE/js/config.js <<EOF
window.INVENTORY_API_URL = 'https://$host/api';
window.ASSET_VERSION = '$version';
EOF

# Replace the ?v=dev placeholders with this deploy's version.
for f in FE/index.html FE/pages/login.html; do
  sed -i.bak "s/?v=dev/?v=$version/g" "$f"
  rm -f "$f.bak"
done

echo "build-ui: API base URL -> https://$host/api"
echo "build-ui: asset version -> $version"
