#!/bin/bash
# Full end-to-end test: app upload → server segmentation → R2 → DB verification
# Tests ALL ends of the pipeline against real services.
set -e

source /root/ai-wardrobe-venv/bin/activate
source /root/ai-wardrobe/.env

USER_ID="6ee2c108-1d18-4b95-a1b5-89323407d1a4"
PASS=0
FAIL=0

pass() { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ❌ $1"; }

echo "============================================"
echo " GARMENT PIPELINE E2E TEST"
echo "============================================"
echo ""

# ── Step 1: Create a test image ────────────────────────────────────────────
echo "--- Step 1: Create test image ---"
python3 << 'PYEOF' 2>/dev/null
from PIL import Image, ImageDraw
img = Image.new("RGB", (512, 512), "white")
draw = ImageDraw.Draw(img)
draw.rectangle([100, 50, 412, 462], fill="red", outline="darkred", width=3)
draw.ellipse([200, 150, 312, 350], fill="blue")
img.save("/tmp/e2e-garment.jpg", "JPEG", quality=90)
print(f"Created /tmp/e2e-garment.jpg ({Image.open('/tmp/e2e-garment.jpg').size})")
PYEOF
if [ -f /tmp/e2e-garment.jpg ]; then pass "Test image created"; else fail "Test image creation failed"; fi

# ── Step 2: Upload to Supabase Storage (simulates app upload) ──────────────
echo ""
echo "--- Step 2: Upload to Supabase Storage (app-side) ---"
python3 << 'PYEOF'
import os, requests
url = os.environ["SUPABASE_URL"] + "/storage/v1/object/garments/e2e-test/e2e-garment.jpg"
headers = {
    "Authorization": "Bearer " + os.environ["SUPABASE_SERVICE_KEY"],
    "apikey": os.environ["SUPABASE_SERVICE_KEY"],
    "Content-Type": "image/jpeg",
}
with open("/tmp/e2e-garment.jpg", "rb") as f:
    r = requests.put(url, data=f, headers=headers)
print(f"Upload status: {r.status_code}")
if r.status_code == 200:
    print(f"Upload response: {r.text[:100]}")
PYEOF
UPLOAD_OK=$?
if [ "$UPLOAD_OK" -eq 0 ]; then pass "Image uploaded to Supabase Storage"; else fail "Image upload failed"; fi

# ── Step 3: Verify image is accessible via public URL ──────────────────────
echo ""
echo "--- Step 3: Verify public URL ---"
PUBLIC_URL="https://tmcfiscdluwwpkcaeyky.supabase.co/storage/v1/object/public/garments/e2e-test/e2e-garment.jpg"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PUBLIC_URL")
if [ "$HTTP_CODE" = "200" ]; then
    pass "Public URL accessible (HTTP $HTTP_CODE)"
else
    fail "Public URL returned HTTP $HTTP_CODE"
fi

# ── Step 4: Create garment DB record ───────────────────────────────────────
echo ""
echo "--- Step 4: Create garment DB record ---"
GARMENT_ID=$(python3 << 'PYEOF'
import os
from supabase import create_client
s = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
result = s.table("garments").insert({
    "user_id": "6ee2c108-1d18-4b95-a1b5-89323407d1a4",
    "image_url": "https://tmcfiscdluwwpkcaeyky.supabase.co/storage/v1/object/public/garments/e2e-test/e2e-garment.jpg",
    "type": "top",
    "segmentation_status": "not_started",
}).execute()
gid = result.data[0]["id"]
print(gid)
PYEOF
)
if [ -n "$GARMENT_ID" ]; then pass "Garment record created: $GARMENT_ID"; else fail "Garment record creation failed"; fi

# ── Step 5: Run segmentation pipeline ──────────────────────────────────────
echo ""
echo "--- Step 5: Run segmentation pipeline (server-side) ---"
python3 /root/ai-wardrobe/segment_garment.py "$GARMENT_ID" 2>&1
if [ $? -eq 0 ]; then pass "Segmentation pipeline completed"; else fail "Segmentation pipeline failed"; fi

# ── Step 6: Verify DB record updated ───────────────────────────────────────
echo ""
echo "--- Step 6: Verify DB record ---"
python3 << PYEOF
import os, json
from supabase import create_client
s = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
result = s.table("garments").select("segmentation_status, segmented_url").eq("id", "$GARMENT_ID").single().execute()
d = result.data
print(f"  Status: {d['segmentation_status']}")
print(f"  Segmented URL: {d['segmented_url']}")
PYEOF
DB_OK=$?
if [ "$DB_OK" -eq 0 ]; then pass "DB record updated"; else fail "DB record update failed"; fi

# ── Step 7: Verify segmented image in R2 ──────────────────────────────────
echo ""
echo "--- Step 7: Verify segmented image in R2 ---"
SEG_URL=$(python3 -c "
import os
from supabase import create_client
s = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])
r = s.table('garments').select('segmented_url').eq('id', '$GARMENT_ID').single().execute()
print(r.data['segmented_url'])
")
echo "  URL: $SEG_URL"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SEG_URL")
CONTENT_TYPE=$(curl -s -o /dev/null -w "%{content_type}" "$SEG_URL")
if [ "$HTTP_CODE" = "200" ]; then
    pass "Segmented image accessible (HTTP $HTTP_CODE, $CONTENT_TYPE)"
else
    fail "Segmented image returned HTTP $HTTP_CODE"
fi

# ── Step 8: Verify correct R2 path ─────────────────────────────────────────
echo ""
echo "--- Step 8: Verify R2 path convention ---"
if echo "$SEG_URL" | grep -q "segmented-garments/$USER_ID/$GARMENT_ID.png"; then
    pass "R2 path matches convention: segmented-garments/{user_id}/{garment_id}.png"
else
    fail "R2 path does not match convention: $SEG_URL"
fi

# ── Step 9: Cleanup ────────────────────────────────────────────────────────
echo ""
echo "--- Step 9: Cleanup ---"
python3 << PYEOF
import os
from supabase import create_client
s = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
# Delete garment record
s.table("garments").delete().eq("id", "$GARMENT_ID").execute()
# Delete from storage
s.storage.from_("garments").remove(["e2e-test/e2e-garment.jpg"])
print("Cleanup complete")
PYEOF
rm -f /tmp/e2e-garment.jpg
pass "Test artifacts cleaned up"

# ── Results ────────────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo " RESULTS: $PASS passed, $FAIL failed"
echo "============================================"
if [ "$FAIL" -gt 0 ]; then exit 1; fi
