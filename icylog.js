/**
 * @licstart The following is the entire license notice for the
 * JavaScript code in this page.
 *
 * Copyright (C) 2014  Tim Vaughan
 *
 *
 * The JavaScript code in this page is free software: you can
 * redistribute it and/or modify it under the terms of the GNU
 * General Public License (GNU GPL) as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.  The code is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.
 *
 * As additional permission under GNU GPL version 3 section 7, you
 * may distribute non-source (e.g., minimized or compacted) forms of
 * that code without the copy of the GNU GPL normally required by
 * section 4, provided you include this license notice and a URL
 * through which recipients can access the Corresponding Source.
 *
 * @licend The above is the entire license notice for the JavaScript
 * code in this page.
 */

// Global variables
var logFile = undefined;
var logFileData = undefined;
var log = undefined;

var variableElements = {};
var traceElements = {};

var pollingIntervalID = undefined;

// Page initialisation code:
$(document).ready(function() {

    $(window).on("resize", update);

    // Set up drag and drop event listeners:
    $(window).on("dragover", function(event) {
        event.preventDefault();
        return false;
    });
    $(window).on("dragend", function(event) {
        event.preventDefault();
        return false;
    });
    $(window).on("drop", function (event) {
        event.preventDefault();
        logFile = event.originalEvent.dataTransfer.files[0];
        loadFile();
    });

    // Set up tabs on main panel
    $("#mainPanel").tabs();

    // Set up options buttons on left panel
    $("#load").button();
    $("#reload").button({disabled: true}).position({
        my: "left",
        at: "right+10",
        of: $("#load").button("widget")});
    $("#polling").button({disabled: true});
    $("select").selectmenu({disabled: true, width: 100});
    $("select").selectmenu("widget").position({
        my: "left",
        at: "right+10",
        of: $("#polling").button("widget")});

    // Set up help menu on left panel
    $("#helpButton").button({disabled: true});
    $("#aboutButton").button();

    // Set up event handlers
    $("#load").click(function() {
        // Clear file input (otherwise can't reload same file)
        $("#fileInput").replaceWith($("#fileInput").clone(true));

        // Trigger click on file input
        if (!$(this).parent().hasClass("ui-state-disabled"))
            $("#fileInput").trigger("click");
    });
    $("#fileInput").change(function() {
        logFile = $("#fileInput").prop("files")[0];
        loadFile();
    });
    $("#reload").click(function() {
        loadFile();
    });
    $("#polling").change(function() {
        togglePolling();
    });
    $("#pollingInterval").on("selectmenuchange", function() {
        updatePollingInterval();
    });

    // Dialog boxes
    $("#about").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        closeText: "ok",
        buttons: {
            Ok: function() {
                $(this).dialog("close");
            }}
    });
    $("#aboutButton").click(function () {
        $("#about").dialog("open");
    });

    update();
});

// Load/reload log file
function loadFile() {
    var reader = new FileReader();
    reader.onload = fileLoaded;
    reader.readAsText(logFile);

    function fileLoaded(evt) {
        logFileData = evt.target.result;
        reloadLogData();
    }
}

// Read log file data into Log object.
function reloadLogData() {
    if (logFileData === undefined)
        return;

    log = Object.create(Log, {}).init(logFileData, "\t");
    updateLoadingButtons();
    updateVariableCheckboxes();
    update();
}

// Special reload function used by polling
function pollingReloadData() {
    var reader = new FileReader();
    reader.onload = function(evt) {
        logFileData = evt.target.result;
        log = Object.create(Log, {}).init(logFileData, "\t");
        updateVariableCheckboxes();
        update();
    };
    reader.readAsText(logFile);
}

// Toggle periodic reloading of file:
function togglePolling() {
    if ($("#polling").is(":checked")) {
        // Start polling

        // Disable load and reload while polling is active
        $("#load").button({disabled: true});
        $("#reload").button({disabled: true});

        pollingIntervalID = setInterval(pollingReloadData,
                                        parseInt($("#pollingInterval").val())*1000);

    } else {
        // Stop polling

        clearInterval(pollingIntervalID);

        // Re-enable load and reload when polling is finished
        $("#load").button({disabled: false});
        $("#reload").button({disabled: false});
    }
}

// Function to update polling interval while polling is active
function updatePollingInterval() {
    if ($("#polling").is(":checked")) {
        clearInterval(pollingIntervalID);
        pollingIntervalID = setInterval(pollingReloadData,
                                        parseInt($("#pollingInterval").val())*1000);
    }
}

// Enable/disable appropriate loading buttons
function updateLoadingButtons() {
    if (logFileData === undefined) {
        $("#reload").button({disabled: true});
        $("#polling").button({disabled: true});
        $("#pollingInterval").selectmenu({disabled: true});
    } else {
        $("#reload").button({disabled: false});
        $("#polling").button({disabled: false});
        $("#pollingInterval").selectmenu({disabled: false});
    }
}

// Ensure SVG is positioned correctly in drop panel.
function updateDropPanel() {

    // Update padding on drop panel:
    var dropPanel = $("#dropPanel");
    dropPanel.html("");
    
    var imgHeight = 136;
    var imgWidth = 368;

    dropPanel.append(
        $("<img/>")
            .attr("src", "icylog_start.svg")
            .attr("height", imgHeight));

    var pad = Math.max(Math.floor((dropPanel.innerHeight()-imgHeight)/2), 0) + "px";
    dropPanel.css("paddingTop", pad);
    dropPanel.css("paddingBottom", pad);
}

// Get checkbox ID string corresponding to variable name
function sanitizeName(name) {
    return name.replace(".","_").replace(" ","_");
};


// Update variable checkboxes:
function updateVariableCheckboxes() {
    if (log === undefined) {
        $("#variables").addClass("ui-helper-hidden");
        return;
    }

    $("#variables").removeClass("ui-helper-hidden");

    // Remove stale checkboxes
    var eidx = 0;
    while (eidx<Object.keys(variableElements).length) {
        var key = Object.keys(variableElements)[eidx];
        if (log.variableNames.indexOf(key)<0) {
            variableElements[key][0].remove();
            variableElements[key][1].remove();
            variableElements[key][2].remove();

            delete variableElements[key];
        }
        else
            eidx += 1;
    }

    // Add new checkboxes
    for (var i=0; i<log.variableNames.length; i++) {
        var thisName = log.variableNames[i];
        var idStr = "check_" + sanitizeName(thisName);

        if (variableElements[thisName] == undefined) {
            var checkbox = $("<input/>")
                    .attr("type", "checkbox")
                    .attr("id", idStr);

            var label = $("<label/>")
                    .attr("for", idStr)
                    .html(thisName);

            var colourBox = $("<div/>")
                    .css("background-color", log.variableLogs[i].getESSColour())
                    .html("&nbsp;");

            variableElements[thisName] = [checkbox, label, colourBox];

            $("#variables").append(checkbox).append(label).append(colourBox);
            checkbox.button();
            checkbox.change(updateMainPanel);
        }

        variableElements[thisName][0].button("widget")
                    .attr("title", log.variableLogs[i].getStatsString());
        variableElements[thisName][2].css("background-color",
                                          log.variableLogs[i].getESSColour());
    }
}

function updateMainPanel() {
    updateTrace();
}

// Update trace panel
function updateTrace() {

    // Remove stale traces
    for (var i=0; i<Object.keys(traceElements).length; i++) {
        var key = Object.keys(traceElements)[i];
        if (log.variableNames.indexOf(key)<0 || !variableElements[key][0].is(":checked")) {
            traceElements[key][0].remove();
            traceElements[key][1].destroy();
            delete traceElements[key];
        }
    }

    // Assemble required <div> elements
    for (var i=0; i<log.variableNames.length; i++) {
        var thisName = log.variableNames[i];
        if (traceElements[thisName] === undefined &&
            variableElements[thisName][0].is(":checked")) {
            traceElements[thisName] = [$("<div/>"), undefined];
            $("#traceTab").append(traceElements[thisName][0]);
        }
    }

    var fullHeight = $("#traceTab").height() - 50;
    var traceCount = Object.keys(traceElements).length;

    var legend;
    if (traceCount>1)
        legend = "default";
    else
        legend = "always";

    for (var i=0; i<Object.keys(traceElements).length; i++) {
        var key = Object.keys(traceElements)[i];
        traceElements[key][0].css("height", fullHeight/traceCount);
    }

    for (var i=0; i<Object.keys(traceElements).length; i++) {
        var key = Object.keys(traceElements)[i];
        var variableIndex = log.variableNames.indexOf(key);

        if (traceElements[key][1] === undefined) {


            var options = {labels: ["Sample", "Trace",
                                    "Mode", "lower 95% HPD", "upper 95% HPD"],
                           xlabel: "Sample",
                           ylabel: log.variableNames[variableIndex],
                           connectSeparatedPoints: true,
                           legend: legend,
                           series: {
                               "Mode": {strokeWidth: 2},
                               "lower 95% HPD": {strokeWidth: 2},
                               "upper 95% HPD": {strokeWidth: 2}}};
            
            traceElements[key][1] = new Dygraph(traceElements[key][0].get(0),
                        log.variableLogs[variableIndex].getSampleRecords(),
                        options);
        } else {
            traceElements[key][1].resize();
            traceElements[key][1].updateOptions({
                file: log.variableLogs[variableIndex].getSampleRecords(),
                legend: legend
            });
        }
        
    }
}

// Redraw everything following file (re)load / window size change
function update() {
    if (logFile === undefined) {
        updateDropPanel();
        $("#mainPanel").addClass("ui-helper-hidden");
        $("#dropPanel").removeClass("ui-helper-hidden");
    } else {
        $("#mainPanel").removeClass("ui-helper-hidden");
        $("#dropPanel").addClass("ui-helper-hidden");
        updateMainPanel();
    }

}

/****************************
          PROTOTYPES
 ****************************/

/**
* Prototype object representing the data contained in a log file.
*/
var Log = Object.create({}, {
    variableLogs: {value: [], writable: true},
    variableNames: {value: [], writable: true},

    // Initialiser
    init: {value: function(logFileString, colSep) {
        this.variableLogs = [];
        this.variableNames = [];

        var lines = logFileString.split('\n');

        var headerRead = false;
        var sampleIdxCol = 0;

        for (var i=0; i<lines.length; i++) {
            var thisLine = lines[i].trim();

            // Skip newlines and comments
            if (thisLine.length == 0 || thisLine[0] == "#")
                continue;

            var fields = thisLine.split(colSep);

            if (!headerRead) {

                // Read header

                for (var fidx=0; fidx<fields.length; fidx++) {
                    if (fields[fidx].toLowerCase() === "sample") {
                        sampleIdxCol = fidx;
                        continue;
                    }

                    var varLog = Object.create(VariableLog, {}).init(fields[fidx]);
                    this.variableLogs.push(varLog);
                    this.variableNames.push(fields[fidx]);
                }

                headerRead = true;

            } else {

                // Read sample record

                var vidx = 0;
                for (var fidx=0; fidx<fields.length; fidx++) {
                    if (fidx==sampleIdxCol)
                        continue;

                    this.variableLogs[vidx].addSample(fields[fidx], fields[sampleIdxCol]);
                    vidx += 1;
                }

            }

        }

        return this;
    }}
});

/**
* Prototype object representing a log of a single variable
*/
var VariableLog = Object.create({}, {
    name: {value: "", writable: true},
    samples: {value: [], writable: true},
    sampleIndices: {value: [], writable: true},
    sampleRecords: {value: [], writable: true},

    ESS: {value: undefined, writable: true},
    ESScalcSteps: {value: 5000, writable: true},

    mean: {value: undefined, writable: true},
    variance: {value: undefined, writable: true},
    HPDandMode: {value: undefined, writable: true},

    burninFrac: {value: 0.1, writable: true},

    init: {value: function(name) {
        this.name = name;
        this.samples = [];
        this.sampleIndices = [];
        this.sampleRecords = [];
        this.ESS = [];

        return this;
    }},

    addSample: {value: function(sampleStr, sampleIdxStr) {

        var sample = parseFloat(sampleStr);
        var sampleIdx = parseInt(sampleIdxStr);

        // Include sample in sample list
        this.samples.push(sample);
        this.sampleIndices.push(sampleIdx);
        this.sampleRecords.push([sampleIdx, sample, null, null, null]);

        // Clear existing mean and 95% HPDs
        if (this.sampleRecords.length>=2) {
            this.sampleRecords[this.sampleRecords.length-2][2] = null;
            this.sampleRecords[this.sampleRecords.length-2][3] = null;
            this.sampleRecords[this.sampleRecords.length-2][4] = null;
        }

        this.sampleStart = Math.floor(this.burninFrac*this.samples.length);

        // Invalidate previously calculated stats
        this.mean = undefined;
        this.variance = undefined;
        this.HPDandMode = undefined;
        this.ESS = undefined;
    }},

    /**
     * Calculate rough ESS using at most as many samples as specified
     * by ESScalcSteps.
     */
    getESS: {value: function() {
        if (this.ESS == undefined) {

            var N = this.samples.length - this.sampleStart;
            var step = Math.ceil(Math.max(1, N/this.ESScalcSteps));
            var n = Math.floor(N/step);

            var roughMean = 0.0;
            var roughStd = 0.0;

            for (var i=0; i<n; i++) {
                var thisVal = this.samples[this.sampleStart+i*step];
                roughMean += thisVal;
                roughStd += thisVal*thisVal;
            }
            roughMean /= n;
            roughStd = Math.sqrt(roughStd/n - roughMean*roughMean);

            var real = new Array(n);
            var imag = new Array(n);

            for (var i=0; i<n; i++) {
                real[i] = (this.samples[this.sampleStart+i*step] - roughMean)/roughStd;
                imag[i] = 0.0;
            }

            transform(real, imag);

            for (i=0; i<n; i++) {
                real[i] = real[i]*real[i] + imag[i]*imag[i];
                imag[i] = 0.0;
            }

            inverseTransform(real, imag);

            // Sum ACF until autocorrelation dips below 0.
            // (Seems to yield decent agreement with Tracer.)
            var sumRho = 0.0;
            for (i=0; i<n; i++) {
                real[i] /= n*n;

                if (i>1 && (real[i-1] + real[i]) < 0)
                    break;
                else
                    sumRho += real[i];
            }

            // Magic formula for calculating ESS.
            this.ESS = n/(1 + 2*sumRho);
        }

        return this.ESS;
    }},

    getMean: {value: function() {
        if (this.mean == undefined) {
            var n = this.samples.length - this.sampleStart;
            
            this.mean = 0.0;
            for (var i=0; i<n; i++) {
                this.mean += this.samples[i+this.sampleStart];
            }
            this.mean /= n;
        }

        return this.mean;
    }},

    getVariance: {value: function() {
        if (this.variance == undefined) {
            var n = this.samples.length - this.sampleStart;
            
            this.variance = 0.0;
            for (var i=0; i<n; i++) {
                this.variance += this.samples[i+this.sampleStart]*this.samples[i+this.sampleStart];
            }
            this.variance /= n;
            this.variance -= this.getMean()*this.getMean();
        }

        return this.variance;
    }},

    getMode: {value: function() {
        return this.getHPDandMode()[2];
    }},

    getHPDlower: {value: function() {
        return this.getHPDandMode()[0];
    }},

    getHPDupper: {value: function() {
        return this.getHPDandMode()[1];
    }},

    getHPDandMode: {value: function() {
        if (this.HPDandMode == undefined) {
            var sorted = this.samples.slice(this.sampleStart).sort(
                function(a,b) {return a-b;});

            var n = sorted.length;
            var lower = sorted[Math.round(0.025*n)];
            var upper = sorted[Math.round(0.975*n)];
            var mode = sorted[Math.round(0.5*n)];

            this.HPDandMode = [lower, upper, mode];
        }

        return this.HPDandMode;
    }},

    /**
     * Retrieve the sample records corresponding to this variable.
     */
    getSampleRecords: {value: function() {
        if (this.sampleRecords.length>0) {
            this.sampleRecords[0][2] = this.getMode();
            this.sampleRecords[this.sampleRecords.length-1][2] = this.getMode();
            this.sampleRecords[0][3] = this.getHPDlower();
            this.sampleRecords[this.sampleRecords.length-1][3] = this.getHPDlower();
            this.sampleRecords[0][4] = this.getHPDupper();
            this.sampleRecords[this.sampleRecords.length-1][4] = this.getHPDupper();
        }

        return this.sampleRecords;
    }},

    /**
     * Convert ESS to colour string.
     */
    getESSColour: {value: function() {

        var goodness = Math.min(1.0, this.getESS()/200.0);

        var red = Math.round(255*0.8*(1.0 - goodness));
        var green = Math.round(255*0.8*goodness);
        
        return "#" +
            ("00" + red.toString(16)).slice(-2) +
            ("00" + green.toString(16)).slice(-2) + "00";
    }},

    getStatsString: {value: function() {
        return "ESS: " + this.getESS().toPrecision(5) + " (rough, max 5000)\n" +
            "Mean: " + this.getMean().toPrecision(5) + "\n" +
            "Mode: " + this.getMode().toPrecision(5) + "\n" +
            "Variance: " + this.getVariance().toPrecision(5) + "\n" +
            "95% HPD interval: [" + this.getHPDlower().toPrecision(5) +
            ", " + this.getHPDupper().toPrecision(5) + "]";
    }}
});
