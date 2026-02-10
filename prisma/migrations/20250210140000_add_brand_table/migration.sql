-- CreateTable
CREATE TABLE "brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_name_key" ON "brand"("name");

-- Add brand_id column as nullable first
ALTER TABLE "car" ADD COLUMN "brand_id" TEXT;

-- Create brands from existing car brands
DO $$
DECLARE
    brand_name TEXT;
BEGIN
    FOR brand_name IN SELECT DISTINCT "brand" FROM "car" WHERE "brand" IS NOT NULL
    LOOP
        INSERT INTO "brand" ("id", "name", "active", "created_at", "updated_at")
        VALUES (gen_random_uuid()::text, brand_name, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("name") DO NOTHING;
    END LOOP;
END $$;

-- Update existing cars to link to brands
UPDATE "car" c
SET "brand_id" = b."id"
FROM "brand" b
WHERE c."brand" = b."name";

-- Make brand_id NOT NULL
ALTER TABLE "car" ALTER COLUMN "brand_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "car" ADD CONSTRAINT "car_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "car_brand_id_idx" ON "car"("brand_id");

-- Drop the old brand column
ALTER TABLE "car" DROP COLUMN "brand";

