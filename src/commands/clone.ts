import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { pipeline } from 'stream';
import { promisify } from 'util';

const streamPipeline = promisify(pipeline);

export const cloneRepo = async (repoUrl: string) => {
  console.log(`🔄 Cloning repository from: ${repoUrl}`);

  // Validation de l'URL
  if (!repoUrl.startsWith('http') || !repoUrl.endsWith('.apm')) {
    console.error('❌ Invalid APM repo URL. It must start with http(s) and end with .apm');
    process.exit(1);
  }

  try {
    const repoName = path.basename(repoUrl).replace('.apm', '');
    const outputDir = path.resolve(process.cwd(), repoName);

    if (fs.existsSync(outputDir)) {
      console.error(`⚠️ Directory "${repoName}" already exists. Aborting.`);
      process.exit(1);
    }

    fs.mkdirSync(outputDir);

    const targetFile = path.join(outputDir, `${repoName}.apm`);

    const response = await axios.get(repoUrl, { responseType: 'stream' });

    await streamPipeline(response.data, fs.createWriteStream(targetFile));

    console.log(`✅ Repository downloaded to "${outputDir}"`);

    // Optionnel : unzip, init, etc.
    console.log('📦 You can now extract or initialize the package as needed.');

  } catch (error: any) {
    console.error('❌ Failed to clone the repository:', error.message);
    process.exit(1);
  }
};