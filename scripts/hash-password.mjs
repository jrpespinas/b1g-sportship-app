#!/usr/bin/env node
//
// Turns a passphrase into the hash you paste into Vercel.
//
// Run it, type the passphrase, copy the single line it prints. The passphrase
// itself never leaves your machine: it is not echoed to the screen, not
// written to any file, and not accepted as an argument — an argument would put
// it in your shell history and in the process list of every other user on the
// machine.
//
//   node scripts/hash-password.mjs
//
import { createInterface } from "node:readline";
import { randomBytes, scryptSync } from "node:crypto";

// Must match SCRYPT in lib/auth.ts, or every hash this prints will be rejected.
// The separator is a colon, not `$`: dotenv expands `$name` as a variable, so a
// `$`-delimited hash arrives at the app truncated to "scrypt".
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };
const MIN_LENGTH = 16;

function askHidden(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise((resolve) => {
    // Overwrite the line on every keystroke so the passphrase never appears
    // on screen or in a scrollback buffer someone can read later.
    const hide = () => rl.output.write(`[2K[200D${question}`);
    rl.input.on("data", hide);
    rl.question(question, (answer) => {
      rl.input.off("data", hide);
      rl.output.write("\n");
      rl.close();
      resolve(answer);
    });
  });
}

const passphrase = (await askHidden("Passphrase (not shown): ")).trim();

if (passphrase.length < MIN_LENGTH) {
  console.error(
    `\nToo short — ${passphrase.length} characters, minimum ${MIN_LENGTH}.\n\n` +
      "This is a shared password on a public URL with no meaningful rate limit\n" +
      "behind it, so its length is the actual defence against guessing. Four or\n" +
      "five random words is ideal: long, and still possible to read down a phone\n" +
      "line to a volunteer.\n",
  );
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const key = scryptSync(passphrase.normalize("NFKC"), salt, SCRYPT.keylen, SCRYPT);

console.log("\nPaste this as the environment variable value:\n");
console.log(`scrypt$${salt}$${key.toString("hex")}\n`);
console.log("Keep the passphrase in a password manager — it cannot be recovered from this hash.\n");
