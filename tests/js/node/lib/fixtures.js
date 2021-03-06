/*
    Test fixtures for use in a range of tests.
 */
/* eslint-env node */
"use strict";
var fluid = require("infusion");
var gpii  = fluid.registerNamespace("gpii");

var jqUnit = require("node-jqunit");

require("gpii-handlebars");

var kettle = require("kettle");
kettle.loadTestingSupport();

require("../../../../");
require("./harness");

fluid.registerNamespace("gpii.test.schema");
gpii.test.schema.checkHtmlResponse = function (message, expected, body) {
    jqUnit.assertTrue(message, body.indexOf(expected) !== -1);
};

// The "base" testEnvironment for use with either express or kettle.
fluid.defaults("gpii.test.schema.testEnvironment.base", {
    gradeNames: ["fluid.test.testEnvironment"],
    port:   7777,
    baseUrl: {
        expander: {
            funcName: "fluid.stringTemplate",
            args: ["http://localhost:%port/", { port: "{testEnvironment}.options.port"}]
        }
    },
    events: {
        constructFixtures: null,
        // Implementers must redefine onFixturesConstructed as a "boiled" event that is fired when all fixtures are
        // ready, or otherwise fire the event themselves.
        onFixturesConstructed: null
    }
});

fluid.defaults("gpii.test.schema.testEnvironment.express", {
    gradeNames: ["gpii.test.schema.testEnvironment.base"],
    events: {
        onHarnessReady: null,
        onFixturesConstructed: {
            events: {
                onHarnessReady: "onHarnessReady"
            }
        }
    },
    components: {
        express: {
            createOnEvent: "constructFixtures",
            type: "gpii.test.schema.harness",
            options: {
                port: "{testEnvironment}.options.port",
                baseUrl: "{testEnvironment}.options.baseUrl",
                listeners: {
                    "onStarted.notifyEnvironment": {
                        func: "{testEnvironment}.events.onHarnessReady.fire"
                    }
                }
            }
        }
    }
});

// TODO: Discuss where this material might live (ideally not gpii-express, although it replaces the pattern used there).
// TODO: Also consolidate the copy in universal depending.
fluid.defaults("gpii.test.schema.startSequence", {
    gradeNames: "fluid.test.sequenceElement",
    sequence: [
        { // This sequence point is required because of a QUnit bug - it defers the start of sequence by 13ms "to avoid any current callbacks" in its words
            func: "{testEnvironment}.events.constructFixtures.fire"
        },
        {
            listener: "fluid.identity",
            event: "{testEnvironment}.events.onFixturesConstructed"
        }
    ]
});

fluid.defaults("gpii.test.schema.standardSequenceGrade", {
    gradeNames: ["fluid.test.sequence"],
    sequenceElements: {
        startServer: {
            gradeNames: "gpii.test.schema.startSequence",
            priority: "before:sequence"
        }
    }
});

fluid.registerNamespace("gpii.test.schema.caseHolder");

// TODO: Reconcile this with the duplicated material in gpii-couchdb-test-harness.
/**
 *
 * Tag any tests without their own `sequenceGrade` with our default grade name.  Any grades with their own value for
 * `sequenceGrade` will be left unaltered.  For more details about sequence grades, see:
 *
 * https://docs.fluidproject.org/infusion/development/IoCTestingFramework.html#example-of-sequence-building-using-sequencegrade
 *
 * @param {Object} rawModules - Fluid IoC test definitions.
 * @param {String} sequenceGrade - The sequence grade to use by default for all tests.
 * @return {Object} - The expanded test definitions.
 *
 */
gpii.test.schema.caseHolder.expandModules = function (rawModules, sequenceGrade) {
    var expandedModules = fluid.copy(rawModules);

    for (var a = 0; a < expandedModules.length; a++) {
        var testSuite = expandedModules[a];
        for (var b = 0; b < testSuite.tests.length; b++) {
            var tests = testSuite.tests[b];
            if (!tests.sequenceGrade) {
                tests.sequenceGrade = sequenceGrade;
            }
        }
    }

    return expandedModules;
};

// TODO: Reconcile this with the duplicated material in gpii-couchdb-test-harness.
// A caseHolder that includes the above sequence Grade to automatically start services.
fluid.defaults("gpii.test.schema.caseHolder", {
    gradeNames: ["fluid.test.testCaseHolder"],
    sequenceGrade: "gpii.test.schema.standardSequenceGrade",
    mergePolicy: {
        rawModules: "noexpand, nomerge"
    },
    moduleSource: {
        funcName: "gpii.test.schema.caseHolder.expandModules",
        args:    ["{that}.options.rawModules", "{that}.options.sequenceGrade"]
    }
});

// A wrapper for `kettle.request.http` designed for use with the above `testEnvironment`.
fluid.defaults("gpii.test.schema.request", {
    gradeNames: ["kettle.test.request.http"],
    port: "{testEnvironment}.options.port",
    path: {
        expander: {
            funcName: "fluid.stringTemplate",
            args:     ["http://localhost:%port/%endpoint", { port: "{testEnvironment}.options.port", endpoint: "{that}.options.endpoint"}]
        }
    }
});
