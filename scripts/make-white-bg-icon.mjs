import fs from "fs";

const logoBuffer = fs.readFileSync("public/MAHLE-Logo.png");
const base64Logo = logoBuffer.toString("base64");

// Create a clean 256x256 SVG with solid white background and rounded corners
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="#ffffff" rx="36"/>
  <image href="data:image/png;base64,${base64Logo}" x="20" y="48" width="216" height="160" preserveAspectRatio="xMidYMid meet"/>
</svg>`;

fs.writeFileSync("public/favicon.svg", svgContent);
fs.writeFileSync("public/MAHLE-Logo-white-bg.svg", svgContent);
fs.writeFileSync("app/icon.svg", svgContent);
console.log("White background favicon SVG assets generated successfully!");
