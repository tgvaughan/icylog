// Page initialisation code:
$(document).ready(function() {

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
});

// Prototype object representing a log of a single variable
var VariableLog = Object.create({}, {
    name: {value: "", writable: true},
    values: {value: [], writable: true},
    ESS: {value: [], writable: true},
    mean: {value: undefined, writable: true},
    variance: {value: undefined, writable: true},
    mode: {value: undefined, writable: true}
});
