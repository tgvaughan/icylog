var logFile = undefined;

// Page initialisation code:
$(document).ready(function() {

    $(window).on("resize", update);

    // Set up tabs on main panel
    $("#mainPanel").tabs();

    // Set up buttons on left panel
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

    update();
});

// Load/reload log file
function loadFile() {
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


// Redraw everything following file (re)load / window size change
function update() {
    if (logFile === undefined)
        updateDropPanel();
}

/****************************
          PROTOTYPES
 ****************************/

// Prototype object representing a log of a single variable
var VariableLog = Object.create({}, {
    name: {value: "", writable: true},
    values: {value: [], writable: true},
    ESS: {value: [], writable: true},
    mean: {value: undefined, writable: true},
    variance: {value: undefined, writable: true},
    mode: {value: undefined, writable: true}
});
