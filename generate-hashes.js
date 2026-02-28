const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const blockhash = require("blockhash-core");

const CARDS_DIR = path.join(__dirname, "src/assets/images/cards");
const OUTPUT_FILE = path.join(__dirname, "src/assets/card-hashes.json");

const HASH_SIZE = 16; // 16x16 = 256 bits (more accurate than 64-bit)
const RESIZE_DIM = 256;

async function generateHash(imagePath) {
    // Resize and grayscale
    const imageBuffer = await sharp(imagePath)
    .resize(RESIZE_DIM, RESIZE_DIM)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

    const { data, info } = imageBuffer;
    const width = info.width;
    const height = info.height;

    // Create mutable copy
    const pixels = Buffer.from(data);

    // Define center mask area
    const maskWidth = Math.floor(width * 0.4);
    const maskHeight = Math.floor(height * 0.3);

    const startX = Math.floor((width - maskWidth) / 2);
    const startY = Math.floor((height - maskHeight) / 2);

    // Apply mask (set to mid-gray)
    for (let y = startY; y < startY + maskHeight; y++) {
        for (let x = startX; x < startX + maskWidth; x++) {
            const idx = y * width + x;
            pixels[idx] = 127; // neutral gray
        }
    }

    // Generate perceptual hash
    const hash = blockhash.bmvbhash(
        { data: pixels, width, height },
        HASH_SIZE
    );

    return hash;
}

async function main() {
    const files = fs.readdirSync(CARDS_DIR);
    const results = [];

    for (const file of files) {
        if (!file.endsWith(".png") && !file.endsWith(".jpg")) continue;

        const fullPath = path.join(CARDS_DIR, file);

        console.log("Hashing:", file);

        const hash = await generateHash(fullPath);

        results.push({
            id: path.parse(file).name,
                     hash: hash
        });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log("Done. Hash file written to:", OUTPUT_FILE);
}

main();
