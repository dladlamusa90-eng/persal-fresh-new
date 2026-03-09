import { authOptions } from "../src/lib/nextAuth";

async function main() {
  const provider = authOptions.providers?.[0] as {
    authorize?: (credentials: Record<string, string>) => Promise<unknown>;
  };

  if (!provider?.authorize) {
    console.log("Credentials provider authorize function not found.");
    process.exit(1);
  }

  const result = await provider.authorize({
    email: "admin@persal.co.za",
    password: "Admin@12345",
  });

  console.log("Authorize result:", result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
