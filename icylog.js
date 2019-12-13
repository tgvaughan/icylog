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
var histElements = {};

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

    // Set up keyboard handler:
    $(document).on("keypress", keyPressHandler);

    // Set up tabs on main panel
    $("#mainPanel").tabs({
        activate: function(event, ui) {updateMainPanel();}
    });

    // Set up options buttons on left panel
    $("#load").button();
    $("#reload").button({disabled: true});
    $("#polling").button({disabled: true});
    $("#pollingInterval").selectmenu({disabled: true, width: 80});
    $("#burninFrac").selectmenu({width: 80});

    // Set up help menu on left panel
    $("#helpButton").button();
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
    $("#burninFrac").on("selectmenuchange", function() {
        if (log != undefined) {
            update();
        }
    });

    // Make left panel resizable
    $("#leftPanel").resizable({
        handles: "e",
        minWidth: 190,
        resize: function(event, ui) {
            $("#dropPanel").css("left", ui.size.width + 10 + "px");
            $("#mainPanel").css("left", ui.size.width + 10 + "px");
        }
    });

    // Dialog boxes

    $("#shortcutHelp").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        buttons: {
            Ok: function() {
                $(this).dialog("close");
            }}
    });
    $("#helpButton").click(function() {
        $("#shortcutHelp").dialog("open");
    });

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

    $("#warning").dialog({
    autoOpen: false,
    modal: true,
    width: 450,
    buttons: {
        "I understand": function() {
            $(this).dialog("close");
        }}
    });

    update();

    // Display warning if required functions unavailable.
    if (!browserValid()) {
        $("#warning").dialog("open");
    }
});

// Tests for the presence of required browser functionality
function browserValid() {
    if (typeof FileReader === "undefined") {
        // Can't load files
        $("#fileLoad").parent().addClass("ui-state-disabled");
        return false;
    }

    return true;
}

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
    if (logFileData === undefined) {
        document.title = "IcyLog";
        return;
    }

    document.title = "IcyLog: " + logFile.name;

    log = Object.create(Log, {}).init(logFileData, "\t");
    updateLoadingButtons();
    update();
}

// Special reload function used by polling
function pollingReloadData() {
    var reader = new FileReader();
    reader.onload = function(evt) {
        logFileData = evt.target.result;
        log = Object.create(Log, {}).init(logFileData, "\t");
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

    // Set max height for variable panel
    $("#variables").css("max-height",
            $("#leftPanel").innerHeight()-
            ($("#options").innerHeight()+$("#help").innerHeight()+30));
}


// Update trace panel
function updateTrace() {

    // Remove stale traces
    var newTraceElements = {};
    for (var i=0; i<Object.keys(traceElements).length; i++) {
        var key = Object.keys(traceElements)[i];
        if (log.variableNames.indexOf(key)<0 || !variableElements[key][0].is(":checked")) {
            traceElements[key][0].remove();
            traceElements[key][1].destroy();
        } else {
            newTraceElements[key] = traceElements[key];
        }
    }
    traceElements = newTraceElements;

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
                                    "Median", "lower 95% HPD", "upper 95% HPD"],
                           colors: ["#CC6600", "#003366", "#003366", "#003366"],
                           xlabel: "Sample",
                           ylabel: log.variableNames[variableIndex],
                           connectSeparatedPoints: true,
                           legend: legend,
                           labelsSeparateLines: true,
                           valueRange: log.variableLogs[variableIndex].getRange(),
                           series: {
                               "Median": {strokeWidth: 2},
                               "lower 95% HPD": {strokeWidth: 2, strokePattern: [10,5]},
                               "upper 95% HPD": {strokeWidth: 2, strokePattern: [10,5]}}};

            traceElements[key][1] = new Dygraph(traceElements[key][0].get(0),
                        log.variableLogs[variableIndex].getSampleRecords(),
                        options);
        } else {
            traceElements[key][1].resize();
            traceElements[key][1].updateOptions({
                file: log.variableLogs[variableIndex].getSampleRecords(),
                legend: legend,
                valueRange: log.variableLogs[variableIndex].getRange()
            });
        }

    }
}

// Update histogram panel
function updateHist() {

    // Remove stale histograms
    var newHistElements = {};
    for (var i=0; i<Object.keys(histElements).length; i++) {
        var key = Object.keys(histElements)[i];
        if (log.variableNames.indexOf(key)<0 || !variableElements[key][0].is(":checked")) {
            histElements[key][0].remove();
            histElements[key][1].destroy();
        } else {
            newHistElements[key] = histElements[key];
        }
    }
    histElements = newHistElements;

    // Assemble required <div> elements
    for (var i=0; i<log.variableNames.length; i++) {
        var thisName = log.variableNames[i];
        if (histElements[thisName] === undefined &&
            variableElements[thisName][0].is(":checked")) {
            histElements[thisName] = [$("<div/>"), undefined];
            $("#histTab").append(histElements[thisName][0]);
        }
    }

    var fullHeight = $("#histTab").height() - 50;
    var histCount = Object.keys(histElements).length;


    for (var i=0; i<Object.keys(histElements).length; i++) {
        var key = Object.keys(histElements)[i];
        histElements[key][0].css("height", fullHeight/histCount);
    }

    for (var i=0; i<Object.keys(histElements).length; i++) {
        var key = Object.keys(histElements)[i];
        var variableIndex = log.variableNames.indexOf(key);
        var variableName = log.variableNames[variableIndex];
        var variableLog = log.variableLogs[variableIndex];

        var histogramData = variableLog.getHistogram();
        var histogramWindow = variableLog.getHistogramWindow();

        // Callback function responsible for plotting histogram bars.
        // Colours bars depending on whether or not they fall within the 95% HPD.
        // Partial colouring of bars which include the HPD boundaries supported.
        var plotterCallback = function(e) {
            var thislog = arguments.callee.log;
            var canvas = e.drawingContext;
            var points = e.points;

            var yBottom = e.dygraph.toDomYCoord(0);
            var hpdLeft = e.dygraph.toDomXCoord(thislog.getHPDlower());
            var hpdRight = e.dygraph.toDomXCoord(thislog.getHPDupper());

            var bar_width = Infinity;
            for (var i=1; i<points.length; i++) {
                var sep = points[i].canvasx - points[i-1].canvasx;
                if (sep < bar_width)
                    bar_width = sep;
            }

            var lineStyle = "rgba(255,255,255,1)";
            var hpdStyle = "rgba(255,0,0,1)";
            var regStyle = "rgba(0,0,255,1)";

            for (var i=0; i<points.length; i++) {
                var point = points[i];

                var left = point.canvasx - 0.5*bar_width;
                var right = point.canvasx + 0.5*bar_width;

                var beforeHPDwidth = Math.max(0, Math.min(bar_width, hpdLeft-left));
                canvas.fillStyle = regStyle;
                canvas.fillRect(left,
                                point.canvasy,
                                beforeHPDwidth,
                                yBottom-point.canvasy);
                left += beforeHPDwidth;

                var HPDwidth = Math.max(0, Math.min(bar_width-beforeHPDwidth, hpdRight-left));
                canvas.fillStyle = hpdStyle;
                canvas.fillRect(left,
                                point.canvasy,
                                HPDwidth,
                                yBottom-point.canvasy);
                left += HPDwidth;

                var afterHPDwidth = Math.max(0, Math.min(bar_width-beforeHPDwidth-HPDwidth, right-hpdRight));
                canvas.fillStyle = regStyle;
                canvas.fillRect(left,
                                point.canvasy,
                                afterHPDwidth,
                                yBottom-point.canvasy);

                canvas.strokeStyle = lineStyle;
                canvas.strokeRect(point.canvasx - 0.5*bar_width,
                                point.canvasy,
                                bar_width,
                                yBottom-point.canvasy);
            }

        }
        plotterCallback.log = variableLog;

        if (histElements[key][1] === undefined) {

            // Create new plot

            var options = {labels: ["Bin Centre", "Frequency"],
                           colors: ["#0000FF"],
                           xlabel: log.variableNames[variableIndex],
                           ylabel: "Frequency",
                           connectSeparatedPoints: true,
                           labelsSeparateLines: true,
                           drawPoints: true,
                           pointSize: 4,
                           dateWindow: histogramWindow,
                           plotter: plotterCallback};

            histElements[key][1] = new Dygraph(histElements[key][0].get(0),
                                               histogramData,
                                               options);
        } else {

            // Update existing plot

            histElements[key][1].resize();
            histElements[key][1].updateOptions({
                file: histogramData,
                dateWindow: histogramWindow,
                plotter: plotterCallback
            });
        }

    }
}

// Update stuff displayed on the main panel
function updateMainPanel() {
    switch ($("#mainPanel").tabs("option","active")) {

    case 0: // trace panel
        updateTrace();
        break;

    case 1: // histogram panel
        updateHist();
        break;

    }
}

// Redraw everything following file (re)load / window size change
function update() {
    if (logFile === undefined) {
        updateDropPanel();
        $("#mainPanel").addClass("ui-helper-hidden");
        $("#dropPanel").removeClass("ui-helper-hidden");
    } else {

        log.setBurninFrac($("#burninFrac").val());
        $("#mainPanel").removeClass("ui-helper-hidden");
        $("#dropPanel").addClass("ui-helper-hidden");
        updateVariableCheckboxes();
        updateMainPanel();
    }
}

// Keyboard event handler
function keyPressHandler(event) {

    if (event.target !== document.body)
        return;

    var eventChar = String.fromCharCode(event.charCode);

    switch (eventChar) {
    case "?":
        // Keyboard shortcut help
        $("#shortcutHelp").dialog("open");
        event.preventDefault();
        return;

    case "l":
        // Load data from file
        $("#load").click();
        event.preventDefault();
        return;

    case "r":
        // Reload:
        loadFile();
        break;

    case "t":
        // Display traces
        $("#mainPanel").tabs("option", "active", 0);
        break;

    case "h":
        // Display histograms
        $("#mainPanel").tabs("option", "active", 1);
        break;
    }
}
