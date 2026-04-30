const fs = require("fs");
const path = require("path");
const os = require("os");
const selfsigned = require("selfsigned");

const outDir = path.join(process.cwd(), "dev-certs");
const keyPath = path.join(outDir, "key.pem");
const certPath = path.join(outDir, "cert.pem");

const interfaces = os.networkInterfaces();
const ipSet = new Set(["127.0.0.1"]);
for (const iface of Object.values(interfaces)) {
  for (const net of iface || []) {
    if (net.family === "IPv4") {
      ipSet.add(net.address);
    }
  }
}

const altNames = [{ type: 2, value: "localhost" }];
for (const ip of ipSet) {
  altNames.push({ type: 7, ip });
}

async function main() {
  const attrs = [{ name: "commonName", value: "persal.local" }];
  const pems = await selfsigned.generate(attrs, {
    algorithm: "sha256",
    keySize: 2048,
    days: 365,
    extensions: [
      {
        name: "subjectAltName",
        altNames,
      },
    ],
  });

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(keyPath, pems.private, "utf8");
  fs.writeFileSync(certPath, pems.cert, "utf8");

  console.log("Generated HTTPS dev certificate:");
  console.log(keyPath);
  console.log(certPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
