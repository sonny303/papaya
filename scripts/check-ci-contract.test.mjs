import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parseWorkflow, validateCiContract } from "./check-ci-contract.mjs";

const workflow = await readFile(
  new URL("../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

function mutateOnce(source, before, after) {
  assert.ok(source.includes(before), `fixture must contain: ${before}`);
  return source.replace(before, after);
}

function mutateLast(source, before, after) {
  const index = source.lastIndexOf(before);
  assert.notEqual(index, -1, `fixture must contain: ${before}`);
  return `${source.slice(0, index)}${after}${source.slice(index + before.length)}`;
}

function mutateJob(source, jobName, mutation) {
  const startMarker = `\n  ${jobName}:\n`;
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `fixture must contain job: ${jobName}`);
  const remainder = source.slice(start + startMarker.length);
  const nextJob = remainder.match(/\n  [A-Za-z0-9_-]+:\n/);
  const end =
    nextJob?.index === undefined
      ? source.length
      : start + startMarker.length + nextJob.index;
  const job = source.slice(start, end);
  return `${source.slice(0, start)}${mutation(job)}${source.slice(end)}`;
}

function expectFailure(source, pattern) {
  const failures = validateCiContract(source);
  assert.ok(
    failures.some((failure) => pattern.test(failure)),
    `expected ${pattern}, received:\n${failures.join("\n")}`,
  );
}

test("parser preserves nested jobs, steps, with fields, and block paths", () => {
  const parsed = parseWorkflow(workflow);
  assert.deepEqual(Object.keys(parsed.jobs), [
    "build",
    "artifact-contract",
    "browser",
  ]);
  assert.equal(
    parsed.jobs.build.outputs["artifact-id"],
    "${{ steps.build-artifact.outputs.artifact-id }}",
  );
  assert.match(
    parsed.jobs.browser.steps.at(-1).with.path,
    /playwright-report\//,
  );
});

test("parser rejects invalid YAML scalar syntax instead of false-green validation", () => {
  expectFailure(
    mutateOnce(workflow, "name: Verify source", "name: Verify: source"),
    /invalid plain scalar/,
  );
  expectFailure(
    mutateOnce(workflow, "name: Verify source", 'name: "Verify source'),
    /invalid double-quoted scalar/,
  );
  expectFailure(
    mutateOnce(
      workflow,
      "      - name: Verify source\n        id: source-verification\n        run: pnpm verify:source",
      "      - null",
    ),
    /must be a mapping/,
  );
  expectFailure(
    mutateOnce(workflow, "name: Verify source", "name: Verify\u0000source"),
    /forbidden YAML control character/,
  );
});

test("checked-in workflow satisfies the structural contract fixture", () => {
  assert.deepEqual(validateCiContract(workflow), []);
});

test("rejects dead steps and misplaced or alternate builds", () => {
  expectFailure(
    mutateOnce(
      workflow,
      "        run: pnpm build",
      "        if: false\n        run: pnpm build",
    ),
    /always-false condition/,
  );
  expectFailure(
    mutateOnce(
      workflow,
      "        run: pnpm release:verify\n      - name: Verify downloaded output",
      "        run: pnpm release:verify\n      - name: Misplaced build\n        run: pnpm build\n      - name: Verify downloaded output",
    ),
    /misplaced in artifact-contract/,
  );
  expectFailure(
    mutateOnce(
      workflow,
      "        run: pnpm build",
      "        run: pnpm run build",
    ),
    /alternate build command/,
  );
});

test("rejects setup and command interleaving that partial order checks miss", () => {
  const install =
    "      - name: Install dependencies\n        run: pnpm install --frozen-lockfile\n";
  const reordered = mutateJob(workflow, "artifact-contract", (job) => {
    assert.ok(job.includes(install));
    return job
      .replace(install, "")
      .replace("    steps:\n", `    steps:\n${install}`);
  });
  expectFailure(reordered, /executable step sequence differs/);

  expectFailure(
    mutateOnce(
      workflow,
      "        id: candidate-build\n        run: pnpm build",
      "        id: candidate-build\n        if: always()\n        run: pnpm build",
    ),
    /unexpected conditional step/,
  );
  expectFailure(
    mutateOnce(
      workflow,
      "        id: browser-tests\n        run: pnpm test:e2e",
      "        id: browser-tests\n        continue-on-error: true\n        run: pnpm test:e2e",
    ),
    /fields outside the step contract/,
  );
});

test("rejects artifact substitution and broad upload paths", () => {
  expectFailure(
    mutateOnce(
      workflow,
      "          artifact-ids: ${{ needs.build.outputs.artifact-id }}",
      "          name: papaya-build-${{ github.sha }}-${{ github.run_attempt }}",
    ),
    /exact artifact-ID download/,
  );
  expectFailure(
    mutateOnce(
      workflow,
      "          digest-mismatch: error",
      "          digest-mismatch: warn",
    ),
    /exact artifact-ID download/,
  );
  expectFailure(
    mutateOnce(workflow, "          path: dist/", "          path: ."),
    /broad or dynamic artifact path/,
  );
  expectFailure(
    mutateOnce(
      workflow,
      "          include-hidden-files: false",
      "          include-hidden-files: true",
    ),
    /immutable candidate upload/,
  );
});

test("rejects weakened or incomplete evidence collection", () => {
  expectFailure(
    mutateJob(workflow, "build", (job) =>
      mutateLast(
        job,
        "          retention-days: 14",
        "          retention-days: 7",
      ),
    ),
    /source evidence upload/,
  );
  expectFailure(
    mutateJob(workflow, "build", (job) =>
      mutateOnce(
        job,
        "      - name: Upload source evidence\n        if: always()",
        "      - name: Upload source evidence",
      ),
    ),
    /source evidence upload|every evidence upload/,
  );
  expectFailure(
    mutateJob(workflow, "browser", (job) =>
      mutateOnce(
        job,
        "            evidence/browser-${{ matrix.project }}.json\n",
        "",
      ),
    ),
    /bounded evidence upload/,
  );
  expectFailure(
    mutateJob(workflow, "browser", (job) =>
      mutateOnce(
        job,
        "          if-no-files-found: error",
        "          if-no-files-found: ignore",
      ),
    ),
    /bounded evidence upload/,
  );
});

test("rejects changed dependencies, outputs, and action pins", () => {
  expectFailure(
    mutateOnce(workflow, "    needs: build", "    needs: browser"),
    /artifact-contract must need build/,
  );
  expectFailure(
    mutateOnce(
      workflow,
      "      artifact-digest: ${{ steps.build-artifact.outputs.artifact-digest }}",
      "      artifact-digest: untrusted",
    ),
    /expose the candidate artifact ID and digest/,
  );
  expectFailure(
    mutateOnce(
      workflow,
      "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
      "actions/upload-artifact@v7",
    ),
    /not pinned to a full commit SHA/,
  );
});

test("rejects unpinned Docker actions and duplicate YAML keys", () => {
  expectFailure(
    mutateOnce(
      workflow,
      "      - name: Run browser tests",
      "      - name: Unpinned container\n        uses: docker://alpine:3.22\n      - name: Run browser tests",
    ),
    /Docker reference is not pinned by SHA-256 digest/,
  );
  expectFailure(
    mutateOnce(
      workflow,
      "          overwrite: false\n          include-hidden-files: false",
      "          overwrite: false\n          overwrite: true\n          include-hidden-files: false",
    ),
    /duplicate key overwrite/,
  );
});

test("rejects privileged triggers, secrets, and publishing commands", () => {
  expectFailure(
    mutateOnce(
      workflow,
      "  pull_request:\n",
      "  pull_request:\n  pull_request_target:\n",
    ),
    /pull_request_target is forbidden/,
  );
  expectFailure(
    mutateOnce(
      workflow,
      "        run: pnpm audit --audit-level=moderate",
      "        env:\n          TOKEN: ${{ secrets.DEPLOY_TOKEN }}\n        run: pnpm audit --audit-level=moderate",
    ),
    /must not reference secrets/,
  );
  expectFailure(
    mutateOnce(
      workflow,
      "        run: pnpm build",
      "        run: vercel deploy --prod",
    ),
    /must not deploy or publish/,
  );
});
