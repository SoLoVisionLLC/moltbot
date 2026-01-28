import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const HASH_FILE = path.join(ROOT_DIR, "src/canvas-host/a2ui/.bundle.hash");
const OUTPUT_FILE = path.join(ROOT_DIR, "src/canvas-host/a2ui/a2ui.bundle.js");
const A2UI_RENDERER_DIR = path.join(ROOT_DIR, "vendor/a2ui/renderers/lit");
const A2UI_APP_DIR = path.join(ROOT_DIR, "apps/shared/MoltbotKit/Tools/CanvasA2UI");

const INPUT_PATHS = [
    path.join(ROOT_DIR, "package.json"),
    path.join(ROOT_DIR, "pnpm-lock.yaml"),
    A2UI_RENDERER_DIR,
    A2UI_APP_DIR,
];

async function getFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    try {
        const entries = await fs.readdir(dir);
        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const st = await fs.stat(fullPath);
            if (st.isDirectory()) {
                files.push(...(await getFiles(fullPath)));
            } else {
                files.push(fullPath);
            }
        }
    } catch (e) {
        // If directory doesn't exist, strictly speaking the bash script checks explicitly before this.
        // The bash script checks if A2UI_RENDERER_DIR or A2UI_APP_DIR exist, if not exits 0.
        return [];
    }
    return files;
}

function normalize(p: string) {
    return p.split(path.sep).join("/");
}

async function computeHash() {
    const files: string[] = [];
    for (const input of INPUT_PATHS) {
        const st = await fs.stat(input).catch(() => null);
        if (!st) continue;
        if (st.isDirectory()) {
            files.push(...(await getFiles(input)));
        } else {
            files.push(input);
        }
    }

    files.sort((a, b) => normalize(a).localeCompare(normalize(b)));

    const hash = createHash("sha256");
    for (const filePath of files) {
        const rel = normalize(path.relative(ROOT_DIR, filePath));
        hash.update(rel);
        hash.update("\0");
        const content = await fs.readFile(filePath);
        hash.update(content);
        hash.update("\0");
    }
    return hash.digest("hex");
}

async function main() {
    const rendererExists = await fs.stat(A2UI_RENDERER_DIR).then(() => true).catch(() => false);
    const appExists = await fs.stat(A2UI_APP_DIR).then(() => true).catch(() => false);

    if (!rendererExists || !appExists) {
        console.log("A2UI sources missing; keeping prebuilt bundle.");
        process.exit(0);
    }

    const currentHash = await computeHash();
    let previousHash = "";

    try {
        previousHash = await fs.readFile(HASH_FILE, "utf-8");
    } catch (e) {
        // ignore missing hash file
    }

    const outputFileExists = await fs.stat(OUTPUT_FILE).then(() => true).catch(() => false);

    if (previousHash.trim() === currentHash && outputFileExists) {
        console.log("A2UI bundle up to date; skipping.");
        process.exit(0);
    }

    try {
        console.log("Building A2UI bundle...");

        // pnpm -s exec tsc -p "$A2UI_RENDERER_DIR/tsconfig.json"
        execSync(`pnpm -s exec tsc -p "${A2UI_RENDERER_DIR}/tsconfig.json"`, {
            stdio: 'inherit',
            cwd: ROOT_DIR
        });

        // rolldown -c "$A2UI_APP_DIR/rolldown.config.mjs"
        execSync(`npx rolldown -c "${A2UI_APP_DIR}/rolldown.config.mjs"`, {
            stdio: 'inherit',
            cwd: ROOT_DIR
        });

        await fs.writeFile(HASH_FILE, currentHash);
        console.log("A2UI bundle built successfully.");

    } catch (error) {
        console.error("A2UI bundling failed.");
        console.error("If this persists, verify pnpm deps and try again.");
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
