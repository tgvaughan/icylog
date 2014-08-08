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

var tracePlots = [];

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
    $("#periodicPolling").button({disabled: true});
    $("select").selectmenu({disabled: true, width: 100});
    $("select").selectmenu("widget").position({
        my: "left",
        at: "right+10",
        of: $("#periodicPolling").button("widget")});

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
    updateVariableCheckboxes();
    update();
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

    $("#variables > input").each(function(index, value) {
        var keep = false;
        for (var i=0; i<log.variableNames.length; i++) {
            var thisName = log.variableNames[i];
            if ("check_" + sanitizeName(thisName) == $(this).attr("id")) {
                keep = true;
                break;
            }
        }

        if (!keep) {
            $(value).next().remove();
            $(value).remove();
        }
            
    });

    for (var i=0; i<log.variableNames.length; i++) {
        var thisName = log.variableNames[i];
        var idstr = "check_" + sanitizeName(thisName);

        if ($("#"+idstr).length==0) {
            var checkbox = $("<input/>")
                    .attr("type", "checkbox")
                    .attr("id", idstr);

            var label = $("<label/>")
                    .attr("for", idstr)
                    .html(thisName);

            $("#variables").append(checkbox).append(label);
            checkbox.button();

            checkbox.change(updateMainPanel);
        }
    }
}

function updateMainPanel() {
    updateTrace();
}

// Update trace panel
function updateTrace() {

    // Clear existing stuff

    var ul = $("#traceTab > ul");
    if (ul.length == 0) {
        ul = $("<ul/>");
        $("#traceTab").append(ul);
    }

    ul.children().each(function() {
        var variableName = $(this).attr("id").replace("check_","");
        var index = log.variableNames.indexOf(variableName);
        if (index<0)
            $(this).remove();
    });

    var livec = [];
    var j=0;
    for (var i=0; i<log.variableNames.length; i++) {
        var thisName = log.variableNames[i];
        if ($("#" + "check_" + sanitizeName(thisName)).is(":checked")) {
            livec.push($("<li/>"));
            ul.append(livec[j]);

            j += 1;
        }
    }

    var fullHeight = 0.95*$("#traceTab").innerHeight();
    var fullWidth = $("#traceTab").innerWidth();

    j=0;
    for (var i=0; i<log.variableNames.length; i++) {
        var thisName = log.variableNames[i];
        if ($("#" + "check_" + sanitizeName(thisName)).is(":checked")) {
            
            livec[j].height(fullHeight/livec.length);
            livec[j].width(fullWidth);
            var options = {labels: ["Sample", log.variableNames[i]],
                           xlabel: "Sample",
                           ylabel: log.variableNames[i],
                           width: fullWidth};
            new Dygraph(livec[j].get(0),
                        log.variableLogs[i].getSampleArray(),
                        options);

            j += 1;
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

// Prototype object representing a log of a single variable
var VariableLog = Object.create({}, {
    name: {value: "", writable: true},
    samples: {value: [], writable: true},
    sampleIndices: {value: [], writable: true},
    ESS: {value: undefined, writable: true},
    mean: {value: undefined, writable: true},
    variance: {value: undefined, writable: true},
    mode: {value: undefined, writable: true},
    burninFrac: {value: 0.1, writable: true},
    burninEnd: {value: undefined, writable: true},

    sampleArray: {value: undefined, writable: true},

    init: {value: function(name) {
        this.name = name;
        this.samples = [];
        this.sampleIndices = [];
        this.ESS = [];

        return this;
    }},

    addSample: {value: function(sample, sampleIdx) {
        // Include sample in sample list
        this.samples.push(parseFloat(sample));
        this.sampleIndices.push(parseInt(sampleIdx));

        this.sampleStart = Math.floor(this.burninFrac*this.samples.length);

        // Invalidate previously calculated stats
        this.mean = undefined;
        this.mode = undefined;
        this.variance = undefined;
        this.ESS = undefined;
        this.sampleArray = undefined;
    }},

    // Retrieve array of sample data for plotting
    getSampleArray: {value: function() {
        if (this.sampleArray == undefined) {
            this.sampleArray = [];
            var n = this.samples.length - this.sampleStart;
            
            for (var i=this.sampleStart; i<this.samples.length; i++)
                this.sampleArray.push([this.sampleIndices[i], this.samples[i]]);
        }

        return this.sampleArray;
    }},

    getESS: {value: function() {
        if (this.ESS == undefined) {

            var n = this.samples.length - this.sampleStart;

            var real = new Array(n);
            var imag = new Array(n);
            for (var i=0; i<n; i++) {
                real[i] = (this.samples[i+this.sampleStart] - this.getMean())/Math.sqrt(this.getVariance());
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
        if (this.mode == undefined) {
        }

        return this.mode;
    }}
    
});
