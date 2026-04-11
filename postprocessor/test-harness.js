#!/usr/bin/env node
/**
 * Test harness: run post-processor on all 16 test cases and report metrics.
 * Exports optimized .drawio files and PNGs for visual comparison.
 *
 * Usage: node test-harness.js [--png] [--verbose]
 */
var fs = require("fs");
var path = require("path");
var { execSync, exec } = require("child_process");
var { postprocess } = require("./postprocess");

var TEST_DIR = path.resolve(__dirname, "..", "test", "drawio");
var OUTPUT_DIR = path.resolve(__dirname, "..", "test", "drawio");
var PNG_OUTPUT_DIR = path.resolve(__dirname, "..", "test", "png");
var DRAWIO_EXE = "C:\\Program Files\\draw.io\\draw.io.exe";

var args = process.argv.slice(2);
var exportPng = args.indexOf("--png") >= 0;
var verbose = args.indexOf("--verbose") >= 0;

function ensureDir(dir)
{
	if (!fs.existsSync(dir))
	{
		fs.mkdirSync(dir, { recursive: true });
	}
}

function getTestFiles()
{
	var files = fs.readdirSync(TEST_DIR);
	var improved = [];

	for (var i = 0; i < files.length; i++)
	{
		if (files[i].match(/^test\d+-improved\.drawio$/))
		{
			improved.push(files[i]);
		}
	}

	// Sort by test number
	improved.sort(function(a, b)
	{
		var numA = parseInt(a.match(/\d+/)[0]);
		var numB = parseInt(b.match(/\d+/)[0]);
		return numA - numB;
	});

	return improved;
}

function exportToPng(drawioPath, pngPath, callback)
{
	var cmd = '"' + DRAWIO_EXE + '" --export --format png --border 10 --output "' +
		pngPath + '" "' + drawioPath + '"';

	exec(cmd, { timeout: 30000 }, function(err, stdout, stderr)
	{
		if (err)
		{
			console.error("  PNG export failed: " + err.message);
		}

		callback();
	});
}

function run()
{
	ensureDir(OUTPUT_DIR);

	if (exportPng) ensureDir(PNG_OUTPUT_DIR);

	var files = getTestFiles();
	var totalBefore = { intersections: 0, waypoints: 0, segments: 0, alignmentNearMisses: 0, unnecessaryWaypoints: 0 };
	var totalAfter = { intersections: 0, waypoints: 0, segments: 0, alignmentNearMisses: 0, unnecessaryWaypoints: 0 };
	var results = [];

	console.log("=".repeat(80));
	console.log("draw.io Post-Processor Test Harness");
	console.log("=".repeat(80));
	console.log("");

	for (var i = 0; i < files.length; i++)
	{
		var file = files[i];
		var testNum = file.match(/\d+/)[0];
		var inputPath = path.join(TEST_DIR, file);
		var outputFile = file.replace("-improved", "-optimized");
		var outputPath = path.join(OUTPUT_DIR, outputFile);

		var xml = fs.readFileSync(inputPath, "utf-8");
		var result = postprocess(xml);

		// Write optimized file
		fs.writeFileSync(outputPath, result.xml, "utf-8");

		// Accumulate totals
		for (var key in totalBefore)
		{
			totalBefore[key] += result.before[key];
			totalAfter[key] += result.after[key];
		}

		var improved = result.before.intersections - result.after.intersections;
		var status = improved > 0 ? " IMPROVED" : (improved < 0 ? " REGRESSED" : "");

		results.push({
			testNum: testNum,
			file: file,
			before: result.before,
			after: result.after,
			changes: result.changes
		});

		if (verbose)
		{
			console.log("Test " + testNum + ": " + file);
			console.log("  Before: " + result.before.intersections + " intersections, " +
				result.before.waypoints + " waypoints, " +
				result.before.alignmentNearMisses + " alignment misses");
			console.log("  After:  " + result.after.intersections + " intersections, " +
				result.after.waypoints + " waypoints, " +
				result.after.alignmentNearMisses + " alignment misses" + status);
			console.log("  Changes: " + result.changes.aligned + " aligned, " +
				result.changes.simplified + " simplified, " +
				result.changes.collisionsFixed + " collisions fixed");
			console.log("");
		}
	}

	// Summary table
	console.log("");
	console.log("SUMMARY");
	console.log("-".repeat(80));

	var header = padRight("Test", 6) +
		padRight("Intersect(B)", 14) +
		padRight("Intersect(A)", 14) +
		padRight("WP(B)", 8) +
		padRight("WP(A)", 8) +
		padRight("Align(B)", 10) +
		padRight("Align(A)", 10) +
		padRight("Delta", 8);

	console.log(header);
	console.log("-".repeat(80));

	for (var i = 0; i < results.length; i++)
	{
		var r = results[i];
		var delta = r.before.intersections - r.after.intersections;
		var deltaStr = delta > 0 ? ("+" + delta) : String(delta);

		console.log(
			padRight(r.testNum, 6) +
			padRight(String(r.before.intersections), 14) +
			padRight(String(r.after.intersections), 14) +
			padRight(String(r.before.waypoints), 8) +
			padRight(String(r.after.waypoints), 8) +
			padRight(String(r.before.alignmentNearMisses), 10) +
			padRight(String(r.after.alignmentNearMisses), 10) +
			padRight(deltaStr, 8)
		);
	}

	console.log("-".repeat(80));

	var totalDelta = totalBefore.intersections - totalAfter.intersections;
	var totalDeltaStr = totalDelta > 0 ? ("+" + totalDelta) : String(totalDelta);

	console.log(
		padRight("TOTAL", 6) +
		padRight(String(totalBefore.intersections), 14) +
		padRight(String(totalAfter.intersections), 14) +
		padRight(String(totalBefore.waypoints), 8) +
		padRight(String(totalAfter.waypoints), 8) +
		padRight(String(totalBefore.alignmentNearMisses), 10) +
		padRight(String(totalAfter.alignmentNearMisses), 10) +
		padRight(totalDeltaStr, 8)
	);

	console.log("");
	console.log("Intersection improvement: " + totalBefore.intersections +
		" -> " + totalAfter.intersections +
		" (" + totalDeltaStr + ")");
	console.log("Waypoint reduction: " + totalBefore.waypoints +
		" -> " + totalAfter.waypoints +
		" (" + (totalBefore.waypoints - totalAfter.waypoints) + " removed)");
	console.log("Alignment improvement: " + totalBefore.alignmentNearMisses +
		" -> " + totalAfter.alignmentNearMisses +
		" (" + (totalBefore.alignmentNearMisses - totalAfter.alignmentNearMisses) + " fixed)");

	// Export PNGs if requested
	if (exportPng)
	{
		console.log("\nExporting PNGs...");
		var pngQueue = [];

		for (var i = 0; i < files.length; i++)
		{
			var file = files[i];
			var outputFile = file.replace("-improved", "-optimized");
			var drawioPath = path.join(OUTPUT_DIR, outputFile);
			var pngPath = path.join(PNG_OUTPUT_DIR, outputFile.replace(".drawio", ".png"));
			pngQueue.push({ drawioPath: drawioPath, pngPath: pngPath, file: outputFile });
		}

		exportPngSequential(pngQueue, 0);
	}
}

function exportPngSequential(queue, index)
{
	if (index >= queue.length)
	{
		console.log("PNG export complete. Files in: " + PNG_OUTPUT_DIR);
		return;
	}

	var item = queue[index];
	console.log("  Exporting: " + item.file);

	exportToPng(item.drawioPath, item.pngPath, function()
	{
		exportPngSequential(queue, index + 1);
	});
}

function padRight(str, len)
{
	while (str.length < len) str += " ";
	return str;
}

run();
