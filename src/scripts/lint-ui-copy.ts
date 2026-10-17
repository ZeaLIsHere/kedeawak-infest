/**
 * Perkakas `npm run lint:ui`.
 *
 * Memindai teks antarmuka pada berkas di `src/` dan menolak emoji, tanda
 * hubung, dan kata terlarang. Aturannya ada di `src/lib/ui-copy/rules.ts`,
 * cara kerjanya dijelaskan di docs/CONVENTIONS.md bagian 2.5.
 *
 * Cara menjalankan: `npm run lint:ui`.
 *
 * Node versi 24 sudah menjalankan berkas TypeScript secara langsung, jadi
 * perkakas ini tidak memerlukan pustaka tambahan. Karena itu pula impor
 * relatif di berkas ini wajib menyertakan ekstensi `.ts`.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

import {
  findViolationsInText,
  RULE_LABELS,
  type UiTextRuleId,
} from "../lib/ui-copy/rules.ts";

const SCANNED_DIRECTORY = "src";

const SCANNABLE_EXTENSIONS: readonly string[] = [".ts", ".tsx"];

/**
 * Berkas dan folder yang tidak dipindai.
 *
 * `src/lib/ui-copy/rules.ts` memuat daftar karakter dan kata terlarang, jadi
 * berkas itu selalu melanggar aturannya sendiri. `src/scripts` berisi
 * perkakas pengembang beserta teks keluarannya, bukan teks antarmuka.
 */
const EXCLUDED_FILES: readonly string[] = ["src/lib/ui-copy/rules.ts"];
const EXCLUDED_DIRECTORIES: readonly string[] = ["src/scripts"];

/**
 * Berkas pengujian memuat contoh teks yang sengaja melanggar aturan, jadi
 * teksnya bukan teks antarmuka dan tidak ikut diperiksa. Aturan teks UI sendiri
 * diuji lewat `npm test` pada `src/lib/ui-copy/rules.test.ts`.
 */
const TEST_FILE_PATTERN = /\.(test|spec)\.tsx?$/u;

/**
 * Atribut JSX yang nilainya bukan teks antarmuka: kelas gaya, alamat, nama
 * teknologi, dan pengatur perilaku. Atribut lain tetap diperiksa, termasuk
 * `placeholder`, `alt`, `title`, dan `aria-label`, karena semuanya dibaca
 * pengguna.
 */
const SKIPPED_JSX_ATTRIBUTES: ReadonlySet<string> = new Set([
  "className",
  "id",
  "key",
  "role",
  "type",
  "name",
  "htmlFor",
  "rel",
  "target",
  "href",
  "src",
  "style",
  "fill",
  "stroke",
  "strokeWidth",
  "strokeLinecap",
  "strokeLinejoin",
  "d",
  "viewBox",
  "xmlns",
  "width",
  "height",
  "slot",
  "asChild",
  "variant",
  "size",
  "side",
  "align",
  "method",
  "action",
  "mode",
  "lang",
  "dir",
  "loading",
  "sizes",
  "srcSet",
  "autoComplete",
  "inputMode",
  "tabIndex",
]);

/**
 * Pemanggil yang seluruh isinya berupa nama kelas, bukan teks pengguna.
 *
 * `docs/CONVENTIONS.md` bagian 2.2 menegaskan bahwa kelas Tailwind tidak
 * dihitung sebagai teks antarmuka.
 */
const STYLING_HELPERS: ReadonlySet<string> = new Set([
  "cn",
  "cva",
  "clsx",
  "classNames",
  "cx",
  "twMerge",
  "tv",
  "createCn",
  "createTwMerge",
  "extendTailwindMerge",
]);

/** Nama variabel CSS, misalnya `--font-geist-sans`, bukan teks antarmuka. */
const CSS_VARIABLE_PATTERN = /^--[A-Za-z0-9-]+$/u;

/**
 * Penanda baris untuk teks yang bukan teks antarmuka.
 *
 * Sebagian nama berasal dari luar dan memang memuat tanda hubung, misalnya
 * nama algoritma penyandian milik OpenSSL. Nama seperti itu tidak boleh
 * diubah, dan tidak pernah dilihat pengguna. Penanda hanya berlaku bila
 * disertai alasan tertulis, jadi penulisan tanpa alasan tidak mengecualikan
 * apa pun dan pelanggarannya tetap dilaporkan.
 */
const IGNORE_MARKER_PATTERN = /lint-ui-ignore:\s*\S/u;

/** Nomor baris yang dikecualikan dari pemeriksaan. */
const ignoredLines = (source: string): ReadonlySet<number> => {
  const lines = new Set<number>();

  source.split(/\r?\n/u).forEach((line, index) => {
    if (IGNORE_MARKER_PATTERN.test(line)) {
      lines.add(index + 1);
    }
  });

  return lines;
};

/** Satu potongan teks antarmuka beserta barisnya. */
export type UiTextPiece = {
  readonly text: string;
  readonly line: number;
};

/** Satu pelanggaran yang sudah diketahui berkas dan barisnya. */
export type ScannedViolation = {
  readonly file: string;
  readonly line: number;
  readonly rule: UiTextRuleId;
  readonly detail: string;
  readonly guidance: string;
  readonly text: string;
};

const toPosix = (value: string): string => value.split(path.sep).join("/");

const truncate = (value: string, max = 70): string =>
  value.length <= max ? value : `${value.slice(0, max)}...`;

/** Nama properti, variabel, dan anggota enum bukan teks pengguna. */
const getNameNode = (node: ts.Node): ts.Node | undefined => {
  if (
    ts.isPropertyAssignment(node) ||
    ts.isPropertyDeclaration(node) ||
    ts.isPropertySignature(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isMethodSignature(node) ||
    ts.isVariableDeclaration(node) ||
    ts.isParameter(node) ||
    ts.isBindingElement(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isClassDeclaration(node) ||
    ts.isClassExpression(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isModuleDeclaration(node) ||
    ts.isEnumDeclaration(node)
  ) {
    return node.name;
  }

  return undefined;
};

/** Pesan untuk pengembang, bukan untuk pengguna. */
const isDeveloperMessage = (node: ts.Node): boolean => {
  if (ts.isThrowStatement(node)) {
    return true;
  }

  if (ts.isNewExpression(node)) {
    const callee = node.expression;
    if (ts.isIdentifier(callee) && callee.text === "Error") {
      return true;
    }
    if (ts.isPropertyAccessExpression(callee) && callee.name.text === "Error") {
      return true;
    }
  }

  if (ts.isCallExpression(node)) {
    const callee = node.expression;
    if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
      return callee.expression.text === "console";
    }
  }

  return false;
};

/** Pemanggil penyusun nama kelas. */
const isStylingCall = (node: ts.Node): boolean => {
  if (!ts.isCallExpression(node)) {
    return false;
  }

  const callee = node.expression;
  if (ts.isIdentifier(callee)) {
    return STYLING_HELPERS.has(callee.text);
  }
  if (ts.isPropertyAccessExpression(callee)) {
    return STYLING_HELPERS.has(callee.name.text);
  }

  return false;
};

/** Bagian pohon yang sama sekali bukan teks antarmuka. */
const isSkippedSubtree = (node: ts.Node): boolean =>
  ts.isImportDeclaration(node) ||
  ts.isImportEqualsDeclaration(node) ||
  ts.isExportDeclaration(node) ||
  ts.isImportTypeNode(node) ||
  ts.isLiteralTypeNode(node) ||
  ts.isTypeQueryNode(node) ||
  ts.isTaggedTemplateExpression(node) ||
  ts.isEnumMember(node) ||
  isStylingCall(node) ||
  isDeveloperMessage(node);

const isSkippedAttribute = (
  attribute: ts.JsxAttribute,
  sourceFile: ts.SourceFile,
): boolean => {
  const name = attribute.name.getText(sourceFile);

  return (
    SKIPPED_JSX_ATTRIBUTES.has(name) || name.startsWith("data-") || /^on[A-Z]/u.test(name)
  );
};

const walk = (
  node: ts.Node,
  sourceFile: ts.SourceFile,
  sink: (text: string, position: number) => void,
): void => {
  if (isSkippedSubtree(node)) {
    return;
  }

  if (ts.isJsxAttribute(node) && isSkippedAttribute(node, sourceFile)) {
    return;
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    if (!CSS_VARIABLE_PATTERN.test(node.text)) {
      sink(node.text, node.getStart(sourceFile));
    }
    return;
  }

  if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
    sink(node.text, node.getStart(sourceFile));
    return;
  }

  if (ts.isJsxText(node)) {
    sink(node.text, node.getStart(sourceFile));
    return;
  }

  const nameNode = getNameNode(node);

  node.forEachChild((child) => {
    if (child === nameNode) {
      return;
    }
    walk(child, sourceFile, sink);
  });
};

/** Kumpulkan seluruh teks antarmuka dari satu berkas yang sudah diurai. */
export function extractUiText(sourceFile: ts.SourceFile): readonly UiTextPiece[] {
  const pieces: UiTextPiece[] = [];

  walk(sourceFile, sourceFile, (text, position) => {
    if (text.trim().length === 0) {
      return;
    }

    pieces.push({
      text,
      line: ts.getLineAndCharacterOfPosition(sourceFile, position).line + 1,
    });
  });

  return pieces;
}

/**
 * `parseDiagnostics` tersedia pada objek SourceFile saat runtime, tetapi tidak
 * ada di tipe publik TypeScript. Cast ini dipakai supaya berkas yang gagal
 * diurai tidak lolos tanpa diperiksa.
 */
const readParseDiagnostics = (sourceFile: ts.SourceFile): readonly ts.Diagnostic[] => {
  const internal = sourceFile as unknown as {
    readonly parseDiagnostics?: readonly ts.Diagnostic[];
  };

  return internal.parseDiagnostics ?? [];
};

/** Periksa satu berkas dan kembalikan seluruh pelanggarannya. */
export function scanSource(
  source: string,
  fileName: string,
): readonly ScannedViolation[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const diagnostics = readParseDiagnostics(sourceFile);
  if (diagnostics.length > 0) {
    const first = diagnostics[0];
    const position = first.start ?? 0;
    const place = ts.getLineAndCharacterOfPosition(sourceFile, position);
    throw new Error(
      `gagal diurai pada baris ${place.line + 1}: ${ts.flattenDiagnosticMessageText(first.messageText, " ")}`,
    );
  }

  const violations: ScannedViolation[] = [];
  const ignored = ignoredLines(source);

  for (const piece of extractUiText(sourceFile)) {
    if (ignored.has(piece.line)) {
      continue;
    }

    for (const violation of findViolationsInText(piece.text)) {
      violations.push({
        file: fileName,
        line: piece.line,
        rule: violation.rule,
        detail: violation.detail,
        guidance: violation.guidance,
        text: piece.text.trim().replace(/\s+/gu, " "),
      });
    }
  }

  return violations;
}

const isExcluded = (relativePath: string): boolean =>
  EXCLUDED_FILES.includes(relativePath) ||
  EXCLUDED_DIRECTORIES.some(
    (directory) => relativePath === directory || relativePath.startsWith(`${directory}/`),
  );

const collectSourceFiles = (directory: string, root: string): readonly string[] => {
  const files: string[] = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);

    if (isExcluded(toPosix(path.relative(root, full)))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(full, root));
      continue;
    }

    if (TEST_FILE_PATTERN.test(entry.name)) {
      continue;
    }

    if (SCANNABLE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      files.push(full);
    }
  }

  return files;
};

const RULE_ORDER: readonly UiTextRuleId[] = ["emoji", "dash", "forbidden"];

/** Jalankan pemeriksaan dan kembalikan kode keluar. */
export function main(): number {
  const root = process.cwd();
  const files = [...collectSourceFiles(path.join(root, SCANNED_DIRECTORY), root)].sort();

  const violations: ScannedViolation[] = [];
  const parseFailures: { readonly file: string; readonly message: string }[] = [];

  for (const file of files) {
    const relative = toPosix(path.relative(root, file));

    try {
      violations.push(...scanSource(fs.readFileSync(file, "utf8"), relative));
    } catch (error) {
      parseFailures.push({
        file: relative,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const lines: string[] = ["Pemeriksaan teks antarmuka", "", "Aturan:"];
  for (const rule of RULE_ORDER) {
    lines.push(`  ${RULE_LABELS[rule]}`);
  }
  lines.push("");

  if (parseFailures.length > 0) {
    lines.push(`Berkas yang tidak dapat diperiksa: ${parseFailures.length}`);
    for (const failure of parseFailures) {
      lines.push(`  ${failure.file}: ${failure.message}`);
    }
    lines.push("");
  }

  if (violations.length === 0) {
    if (parseFailures.length === 0) {
      lines.push(`Tidak ada pelanggaran pada ${files.length} berkas.`);
    }
    console.log(lines.join("\n"));

    return parseFailures.length > 0 ? 1 : 0;
  }

  const affectedFiles = new Set(violations.map((violation) => violation.file));

  for (const violation of violations) {
    lines.push(`${violation.file}:${violation.line}`);
    lines.push(`  Aturan: ${RULE_LABELS[violation.rule]}`);
    lines.push(`  Rincian: ${violation.detail}`);
    lines.push(`  Teks: "${truncate(violation.text)}"`);
    lines.push(`  Perbaikan: ${violation.guidance}`);
    lines.push("");
  }

  lines.push(
    `Ringkasan: ${violations.length} pelanggaran pada ${affectedFiles.size} berkas, dari ${files.length} berkas yang diperiksa.`,
  );

  console.log(lines.join("\n"));

  return 1;
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  process.exitCode = main();
}
