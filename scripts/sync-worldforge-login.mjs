import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("public/index.html", "utf8");
writeFileSync("public/worldforge-login.html", src);

console.log("[sync] worldforge-login.html updated from index.html");
