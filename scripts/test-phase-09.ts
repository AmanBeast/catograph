import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseRepository } from "../lib/parser/index.ts";
import { detectFrameworkAdapter, expressAdapter } from "../lib/adapters/index.ts";
import { deriveFrameworkRailCategories, classifyFileRoleByPath } from "../lib/adapters/taxonomy.ts";

async function runPhase9Tests() {
  console.log("=== PHASE 9 COMMONJS & EXPRESS VERIFICATION TEST ===");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cartograph-p9-test-"));

  try {
    // 1. Create a full CommonJS Express repository fixture
    console.log("\n[1] Creating CommonJS Express test repository fixture...");

    // package.json
    fs.writeFileSync(
      path.join(tempDir, "package.json"),
      JSON.stringify(
        {
          name: "express-sample-app",
          version: "1.0.0",
          dependencies: {
            express: "^4.18.2",
            dotenv: "^16.0.0",
          },
        },
        null,
        2
      )
    );

    // Directories
    const dirs = ["routes", "route", "controllers", "services", "models", "middleware", "utils"];
    for (const d of dirs) {
      fs.mkdirSync(path.join(tempDir, d), { recursive: true });
    }

    // Files
    // app.js
    fs.writeFileSync(
      path.join(tempDir, "app.js"),
      `const express = require('express');
const userRoutes = require('./routes/users');
const singleRoute = require('./route/ping');
const auth = require('./middleware/auth');

const app = express();
app.use(auth);
module.exports = app;
`
    );

    // routes/users.js
    fs.writeFileSync(
      path.join(tempDir, "routes/users.js"),
      `const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();

router.get('/', userController.getUsers);
module.exports = router;
`
    );

    // route/ping.js (singular folder check)
    fs.writeFileSync(
      path.join(tempDir, "route/ping.js"),
      `const express = require('express');
const router = express.Router();
module.exports = router;
`
    );

    // controllers/userController.js
    fs.writeFileSync(
      path.join(tempDir, "controllers/userController.js"),
      `const userService = require('../services/userService');
const User = require('../models/user');

exports.getUsers = function(req, res) {
  return userService.listUsers();
};
exports.createUser = function(req, res) {};
`
    );

    // services/userService.js
    fs.writeFileSync(
      path.join(tempDir, "services/userService.js"),
      `const User = require('../models/user');
const helpers = require('../utils/helpers');

function listUsers() {
  return User.find();
}

module.exports = {
  listUsers,
};
`
    );

    // models/user.js
    fs.writeFileSync(
      path.join(tempDir, "models/user.js"),
      `class UserModel {}
module.exports = {
  User: UserModel,
  Schema: {},
};
`
    );

    // middleware/auth.js
    fs.writeFileSync(
      path.join(tempDir, "middleware/auth.js"),
      `function authMiddleware(req, res, next) { next(); }
exports.authMiddleware = authMiddleware;
module.exports = authMiddleware;
`
    );

    // utils/helpers.js
    fs.writeFileSync(
      path.join(tempDir, "utils/helpers.js"),
      `function formatDate(date) { return ''; }
module.exports = formatDate;
`
    );

    // mixed.js: tests mixed require and import without duplicate edges
    fs.writeFileSync(
      path.join(tempDir, "mixed.js"),
      `import express from 'express';
const express2 = require('express');
const helpers = require('./utils/helpers');

export const dummy = 1;
`
    );

    console.log("  ✓ Test repository fixture created successfully.");

    // 2. Parse repository
    console.log("\n[2] Testing parser on CommonJS files...");
    const parseResult = await parseRepository(tempDir);

    console.log(`  - Files parsed: ${parseResult.files.length}`);
    console.log(`  - Edges discovered: ${parseResult.edges.length}`);
    console.log(`  - Total imports seen: ${parseResult.coverage.totalImportsSeen}`);
    console.log(`  - Internal resolved edges: ${parseResult.coverage.internalResolvedEdges}`);
    console.log(`  - External imports: ${parseResult.coverage.externalImports}`);
    console.log(`  - Unresolved imports: ${parseResult.coverage.unresolvedImports}`);

    // Acceptance Check 1: Draws a real graph with believable edges (not empty!)
    if (parseResult.edges.length === 0) {
      throw new Error("FAIL: CommonJS repo generated 0 edges!");
    }
    console.log("  ✓ Acceptance check 1 passed: Real graph generated with edges.");

    // Acceptance Check 2: Non-zero denominator for imports coverage
    if (parseResult.coverage.totalImportsSeen === 0) {
      throw new Error("FAIL: totalImportsSeen is 0!");
    }
    console.log("  ✓ Acceptance check 2 passed: Coverage reports real denominator (>0).");

    // Check require kinds
    const requireEdges = parseResult.edges.filter((e) => e.kind === "require");
    if (requireEdges.length === 0) {
      throw new Error("FAIL: No edges with kind 'require' found!");
    }
    console.log(`  ✓ Found ${requireEdges.length} edges with kind 'require'.`);

    // Check duplicate prevention in mixed.js
    const mixedEdges = parseResult.edges.filter((e) => e.source === "mixed.js");
    const expressEdgesFromMixed = mixedEdges.filter((e) => e.target.toLowerCase() === "express");
    if (expressEdgesFromMixed.length !== 1) {
      throw new Error(
        `FAIL: mixed.js should have exactly 1 edge to express, got ${expressEdgesFromMixed.length}`
      );
    }
    console.log("  ✓ Mixed file deduplication passed: 1 edge to express despite import + require.");

    // Check exports extraction
    const userModelFile = parseResult.files.find((f) => f.path === "models/user.js");
    if (!userModelFile?.exports?.includes("User") || !userModelFile?.exports?.includes("Schema")) {
      throw new Error(`FAIL: models/user.js exports missing expected keys: ${JSON.stringify(userModelFile?.exports)}`);
    }
    console.log(`  ✓ Export extraction passed for models/user.js: ${JSON.stringify(userModelFile.exports)}`);

    const controllerFile = parseResult.files.find((f) => f.path === "controllers/userController.js");
    if (!controllerFile?.exports?.includes("getUsers") || !controllerFile?.exports?.includes("createUser")) {
      throw new Error(`FAIL: controllers/userController.js exports missing keys: ${JSON.stringify(controllerFile?.exports)}`);
    }
    console.log(`  ✓ Export extraction passed for controllers/userController.js: ${JSON.stringify(controllerFile.exports)}`);

    // 3. Test Express Adapter Detection
    console.log("\n[3] Testing Framework Adapter Detection...");
    const adapter = detectFrameworkAdapter(tempDir, parseResult.files, parseResult.edges);
    if (adapter.name !== "Express") {
      throw new Error(`FAIL: Expected Express adapter, got ${adapter.name}`);
    }
    console.log(`  ✓ Detected adapter: ${adapter.name}`);

    // 4. Test Role Classification (Plural and Singular)
    console.log("\n[4] Testing Express Role Classification...");
    const roles = adapter.classifyFiles(parseResult.files);
    const roleMap = new Map(roles.map((r) => [r.filePath, r.role]));

    const expectedRoles: Record<string, string> = {
      "routes/users.js": "route",
      "route/ping.js": "route",
      "controllers/userController.js": "controller",
      "services/userService.js": "service",
      "models/user.js": "model",
      "middleware/auth.js": "middleware",
      "utils/helpers.js": "utility",
    };

    for (const [filePath, expectedRole] of Object.entries(expectedRoles)) {
      const actual = roleMap.get(filePath);
      if (actual !== expectedRole) {
        throw new Error(`FAIL: Role mismatch for ${filePath}: expected '${expectedRole}', got '${actual}'`);
      }
      console.log(`  ✓ ${filePath} -> ${actual}`);
    }

    // 5. Test Route Extraction (Must return empty table)
    console.log("\n[5] Testing Express Route Extraction Constraint...");
    const routes = adapter.extractRoutes(parseResult.files, tempDir);
    if (routes.length !== 0) {
      throw new Error(`FAIL: Express adapter must return empty routes table, got ${routes.length} routes!`);
    }
    console.log("  ✓ Route constraint passed: Express route table is exactly empty ([]).");

    // 6. Test Rail Categories
    console.log("\n[6] Testing Express Rail Taxonomy Categories...");
    const railCategories = deriveFrameworkRailCategories("Express", parseResult.files, roleMap);
    console.log("  Categories:", railCategories.map((c) => `${c.name} (${c.count})`).join(" -> "));

    const expectedOrder = ["Routes", "Controllers", "Services", "Models", "Middleware", "Utilities"];
    const actualOrder = railCategories.map((c) => c.name);
    for (let i = 0; i < expectedOrder.length; i++) {
      if (actualOrder[i] !== expectedOrder[i]) {
        throw new Error(
          `FAIL: Rail taxonomy order mismatch at index ${i}: expected '${expectedOrder[i]}', got '${actualOrder[i]}'`
        );
      }
    }
    console.log("  ✓ Fixed reading order verified: Routes -> Controllers -> Services -> Models -> Middleware -> Utilities");

    // 7. Test Invariance for Pure ES Module Codebases (Acceptance Check 3)
    console.log("\n[7] Testing Invariance for ES Module Codebase...");
    const esDir = fs.mkdtempSync(path.join(os.tmpdir(), "cartograph-es-test-"));
    try {
      fs.writeFileSync(
        path.join(esDir, "a.ts"),
        `import { b } from './b';\nexport * from './c';\nexport const a = 1;`
      );
      fs.writeFileSync(
        path.join(esDir, "b.ts"),
        `export const b = 2;`
      );
      fs.writeFileSync(
        path.join(esDir, "c.ts"),
        `export const c = 3;`
      );

      const esResult = await parseRepository(esDir);
      const edgeSummary = esResult.edges.map((e) => ({
        source: e.source,
        target: e.target,
        kind: e.kind,
        status: e.status,
      }));

      const expectedEdges = [
        { source: "a.ts", target: "b.ts", kind: "import", status: "resolved" },
        { source: "a.ts", target: "c.ts", kind: "re_export", status: "resolved" },
      ];

      if (JSON.stringify(edgeSummary) !== JSON.stringify(expectedEdges)) {
        throw new Error(`FAIL: ES module edges mismatch: ${JSON.stringify(edgeSummary)}`);
      }
      console.log("  ✓ Acceptance check 3 passed: ES module edge list is strictly preserved.");
    } finally {
      fs.rmSync(esDir, { recursive: true, force: true });
    }

    console.log("\n ALL PHASE 9 ACCEPTANCE TESTS PASSED SUCCESSFULLY! \n");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

runPhase9Tests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
