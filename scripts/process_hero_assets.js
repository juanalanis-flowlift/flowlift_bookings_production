import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
const OUTPUT_DIR = path.join(ROOT_DIR, 'attached_assets');

async function resizeImages() {
    try {
        const files = await fs.readdir(UPLOAD_DIR);
        console.log(`Found ${files.length} files in ${UPLOAD_DIR}`);

        for (const file of files) {
            if (!/\.(jpg|jpeg|png)$/i.test(file)) continue;

            const inputPath = path.join(UPLOAD_DIR, file);
            const outputFilename = `${path.parse(file).name}_optimized.webp`;
            const outputPath = path.join(OUTPUT_DIR, outputFilename);

            console.log(`Processing ${file}...`);

            try {
                await sharp(inputPath)
                    .resize({
                        width: 400,
                        height: 800,
                        fit: 'cover',
                        position: 'top'
                    })
                    .webp({ quality: 80 })
                    .toFile(outputPath);

                console.log(`Saved to ${outputPath}`);

                // Delete original file
                await fs.unlink(inputPath);
                console.log(`Deleted source: ${file}`);
            } catch (procError) {
                console.error(`Failed to process ${file}:`, procError);
            }
        }

        console.log('Batch processing complete!');
    } catch (error) {
        console.error('Error processing items:', error);
    }
}

resizeImages();
