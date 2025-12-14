import fs from "fs";
import path from "path";

const projectRoot = path.resolve(process.cwd());
const wellKnownDir = path.join(projectRoot, "public", ".well-known");
const validationPath = path.join(wellKnownDir, "pi-validation.txt");
const validationKey = process.env.NEXT_PUBLIC_PI_VALIDATION_KEY || "PLACEHOLDER-PI-VALIDATION-KEY";

try {
  fs.mkdirSync(wellKnownDir, { recursive: true });
  fs.writeFileSync(validationPath, validationKey.trim(), "utf8");
  console.log(`Pi validation key written to ${validationPath}`);
} catch (error) {
  console.error("Failed to generate Pi validation file:", error);
  process.exitCode = 1;
}
